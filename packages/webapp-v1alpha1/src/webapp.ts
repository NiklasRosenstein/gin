import { type Gin, type KubernetesObject, makeOriginLabels, type ResourceAdapter } from "@gin/core";

export interface WebApp extends KubernetesObject {
  apiVersion: "webapp.gin.jsr.io/v1alpha1";
  kind: "WebApp";
  spec: {
    /**
     * The number of replicas of the application. If not specified, it defaults to 1.
     */
    replicas?: number;

    /**
     * The main container image for the web application.
     */
    image: string;

    /**
     * The port on which the main web application will listen. Defaults to 8080.
     */
    port?: number;

    /**
     * The hostname or the domain for the web application.
     */
    hostname: string;

    /**
     * Additional hostnames or domains for the web application.
     */
    extraHostnames?: string[];

    /**
     * Allow the application to run as root user. Defaults to false.
     */
    allowRunAsRoot?: boolean;

    /**
     * The environment variables to set in the main container.
     */
    env?: Record<string, string>;

    /**
     * Additional environment variables to set in the main container read from secrets.
     */
    envFromSecrets?: string[];

    /**
     * Labels to apply to the pods spawned by the WebApp. This is effectively the `.spec.template.metadata.labels`
     * field in a Kubernetes Deployment. We do not expose that field directly, or the `.spec.selector.matchLabels`.
     * Instead, the selector is automatically generated based on the WebApp name and namespace to uniquely tie the
     * WebApp to its pods.
     */
    podLabels?: Record<string, string>;

    /**
     * Annotations to apply to the pods spawned by the WebApp.
     */
    podAnnotations?: Record<string, string>;

    /**
     * Annotations to apply to the service created for the WebApp.
     */
    serviceAnnotations?: Record<string, string>;

    /**
     * Annotations for the Ingress resource created for the WebApp.
     */
    ingressAnnotations?: Record<string, string>;

    /**
     * The ingress class to use. Defaults to "nginx".
     */
    ingressClass?: string;

    /**
     * If set, add a `cert-manager.io/cluster-issuer` annotation to the Ingress resource with the specified value.
     */
    clusterIssuer?: string;

    /**
     * If set, add a `cert-manager.io/issuer` annotation to the Ingress resource with the specified value.
     */
    issuer?: string;

    /**
     * The name of the TLS certificate secret to use for the Ingress resource. If not specified, and no
     * `clusterIssuer` or `issuer` is set, the Ingress will not use TLS.
     */
    tlsSecretName?: string;

    /**
     * Optional name of the node on which the WebApp should be scheduled on.
     */
    nodeName?: string;

    /**
     * Optional node selector to use for scheduling the WebApp pods.
     */
    nodeSelector?: Record<string, string>;

    /**
     * Optional resources to apply to the WebApp container.
     */
    resources?: {
      limits?: Record<string, string>;
      requests?: Record<string, string>;
    };
  };
}

export class WebAppConverter implements ResourceAdapter<WebApp> {
  validate(_gin: Gin, resource: WebApp): Promise<void> {
    if (resource.spec.replicas && resource.spec.replicas < 1) {
      throw new Error("WebApp spec.replicas must be at least 1");
    }
    return Promise.resolve();
  }
  generate(_gin: Gin, resource: WebApp): Promise<KubernetesObject[]> {
    const selectorLabels = {
      "app.kubernetes.io/name": resource.metadata.name,
      ...makeOriginLabels(resource),
    };

    const deployment: KubernetesObject = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        labels: selectorLabels,
      },
      spec: {
        replicas: resource.spec.replicas ?? 1,
        selector: {
          matchLabels: selectorLabels,
        },
        template: {
          metadata: {
            labels: {
              ...selectorLabels,
              ...resource.spec.podLabels,
            },
            annotations: resource.spec.podAnnotations,
          },
          spec: {
            containers: [
              {
                name: "web",
                image: resource.spec.image,
                ports: [
                  {
                    containerPort: resource.spec.port ?? 8080,
                  },
                ],
                env: Object.entries(resource.spec.env || {}).map(([name, value]) => ({
                  name,
                  value,
                })),
                envFrom: (resource.spec.envFromSecrets || []).map((secretName) => ({
                  secretRef: { name: secretName },
                })),
                securityContext: {
                  allowPrivilegeEscalation: false,
                  runAsNonRoot: !resource.spec.allowRunAsRoot,
                  runAsUser: resource.spec.allowRunAsRoot ? undefined : 1000, // Non-root user
                },
                resources: resource.spec.resources,
              },
            ],
            nodeName: resource.spec.nodeName,
            nodeSelector: resource.spec.nodeSelector,
          },
        },
      },
    };

    const service: KubernetesObject = {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        labels: selectorLabels,
        annotations: resource.spec.serviceAnnotations,
      },
      spec: {
        selector: selectorLabels,
        ports: [
          {
            name: "http",
            port: resource.spec.port ?? 8080,
            targetPort: resource.spec.port ?? 8080,
          },
        ],
        type: "ClusterIP", // Default service type
      },
    };

    let tlsSecretName: string | undefined;
    if (!resource.spec.tlsSecretName && (resource.spec.clusterIssuer || resource.spec.issuer)) {
      tlsSecretName = `${resource.metadata.name}-tls`;
    } else {
      tlsSecretName = resource.spec.tlsSecretName;
    }

    const ingress: KubernetesObject = {
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        labels: selectorLabels,
        annotations: {
          ...resource.spec.ingressAnnotations,
          ...(resource.spec.clusterIssuer ? { "cert-manager.io/cluster-issuer": resource.spec.clusterIssuer } : {}),
          ...(resource.spec.issuer ? { "cert-manager.io/issuer": resource.spec.issuer } : {}),
        },
      },
      spec: {
        ingressClassName: resource.spec.ingressClass ?? "nginx",
        rules: [resource.spec.hostname, ...(resource.spec.extraHostnames || [])].map((host) => ({
          host: host,
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: resource.metadata.name,
                    port: {
                      name: "http",
                    },
                  },
                },
              },
            ],
          },
        })),
        tls: tlsSecretName
          ? [{
            hosts: [resource.spec.hostname, ...(resource.spec.extraHostnames || [])],
            secretName: tlsSecretName,
          }]
          : undefined,
      },
    };

    return Promise.resolve([deployment, service, ingress]);
  }
}

import { _ } from "@gin/core";
import type {
  Affinity,
  Container,
  ContainerPort,
  Gin,
  KubernetesObject,
  Pod,
  ResourceAdapter,
  Secret,
  SecretValue,
  Service,
  Toleration,
  TopologySpreadConstraint,
  Volume,
  VolumeMount,
} from "@gin/core";
import { dropUndefined } from "@gin/core/utils";

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
     * The image pull policy for the main container. Defaults to "IfNotPresent".
     */
    imagePullPolicy?: "Always" | "IfNotPresent" | "Never";

    /**
     * The command to run in the main container. If not specified, the default command from the image will be used.
     */
    command?: string[];

    /**
     * The port on which the main web application will listen. Defaults to 8080.
     */
    port?: number;

    /**
     * Extra ports to expose in the main container. This is useful for applications that listen on multiple ports.
     */
    extraPorts?: ContainerPort[];

    /**
     * The hostname or the domain for the web application.
     */
    host: string;

    /**
     * Additional hostnames or domains for the web application.
     */
    extraHosts?: string[];

    /**
     * Allow the application to run as root user. Defaults to false.
     */
    allowRunAsRoot?: boolean;

    /**
     * The environment variables to set in the main container.
     */
    env?: Record<string, string>;

    /**
     * Secret key-value pairs to set as environment variables in the main container. If specified,
     * the values will be used to create a new `Secret` resource and mounted as environment variables.
     */
    secretEnv?: Record<string, SecretValue<string>>;

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
     * Tolerations for the WebApp pods. This is useful for scheduling the pods on nodes with specific taints.
     */
    tolerations?: Toleration[];

    /**
     * Affinity rules for the WebApp pods. This is useful for scheduling the pods on specific nodes or avoiding
     * certain nodes.
     */
    affinity?: Affinity;

    /**
     * Topology spread constraints for the WebApp pods.
     */
    topologySpreadConstraints?: TopologySpreadConstraint[];

    /**
     * Optional resources to apply to the WebApp container.
     */
    resources?: {
      limits?: Record<string, string>;
      requests?: Record<string, string>;
    };

    /**
     * Define volumes to be mountable with {@link volumeMounts} in the main container.
     */
    volumes?: Volume[];

    /**
     * Define volume mounts for the main container.
     */
    volumeMounts?: VolumeMount[];

    /**
     * Init containers.
     */
    initContainers?: Container[];

    /**
     * Extra containers next to the main container in the pod.
     */
    extraContainers?: Container[];
  };
}

export class WebAppConverter implements ResourceAdapter<WebApp> {
  async validate(_gin: Gin, resource: WebApp): Promise<void> {
    if (!resource.metadata.name) {
      throw new Error("WebApp metadata.name is required");
    }
    if (!resource.metadata.namespace) {
      throw new Error("WebApp metadata.namespace is required");
    }
    if (resource.spec.replicas !== undefined && resource.spec.replicas < 1) {
      throw new Error("WebApp spec.replicas must be at least 1");
    }
    return await Promise.resolve();
  }
  generate(_gin: Gin, resource: WebApp): Promise<KubernetesObject[]> {
    const selectorLabels = {
      [`${resource.apiVersion}.${resource.kind}`]: resource.metadata.name!,
    };

    let secret: Secret | undefined = undefined;
    if (resource.spec.secretEnv && Object.keys(resource.spec.secretEnv).length > 0) {
      secret = dropUndefined({
        apiVersion: "v1",
        kind: "Secret",
        metadata: {
          name: `${resource.metadata.name}-env`,
          namespace: resource.metadata.namespace,
        },
        type: "Opaque",
        stringData: Object.fromEntries(
          Object.entries(resource.spec.secretEnv).map(([key, value]) => [key, value]),
        ),
      });
    }

    const deployment: KubernetesObject = dropUndefined({
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
      },
      spec: {
        replicas: resource.spec.replicas ?? 1,
        selector: {
          matchLabels: selectorLabels,
        },
        template: _<Pick<Pod, "metadata" | "spec">>({
          metadata: {
            labels: {
              ...selectorLabels,
              ...resource.spec.podLabels,
            },
            annotations: resource.spec.podAnnotations,
          },
          spec: {
            containers: [
              dropUndefined({
                name: "web",
                image: resource.spec.image,
                imagePullPolicy: resource.spec.imagePullPolicy ?? "IfNotPresent",
                command: resource.spec.command,
                ports: [
                  {
                    containerPort: resource.spec.port ?? 8080,
                  },
                ],
                env: resource.spec.env && Object.keys(resource.spec.env).length > 0
                  ? Object.entries(resource.spec.env).map(([name, value]) => ({ name, value }))
                  : undefined,
                envFrom: [
                  ...(
                    secret ? [{ secretRef: { name: secret.metadata.name! } }] : []
                  ),
                  ...(
                    (resource.spec.envFromSecrets ?? []).map((secretName) => ({ secretRef: { name: secretName } }))
                  ),
                ],
                securityContext: {
                  allowPrivilegeEscalation: false,
                  runAsNonRoot: !resource.spec.allowRunAsRoot,
                },
                resources: resource.spec.resources,
                volumeMounts: resource.spec.volumeMounts,
              }),
              ...resource.spec.extraContainers ?? [],
            ],
            initContainers: resource.spec.initContainers,
            nodeName: resource.spec.nodeName,
            nodeSelector: resource.spec.nodeSelector,
            tolerations: resource.spec.tolerations,
            affinity: resource.spec.affinity,
            topologySpreadConstraints: resource.spec.topologySpreadConstraints,
            volumes: resource.spec.volumes,
          },
        }),
      },
    });

    const service: Service = dropUndefined({
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
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
          ...(resource.spec.extraPorts || []).map((port) => ({
            name: port.name ?? `port-${port.containerPort}`,
            port: port.containerPort,
            targetPort: port.name ?? port.containerPort,
          })),
        ],
        type: "ClusterIP", // Default service type
      },
    });

    let tlsSecretName: string | undefined;
    if (!resource.spec.tlsSecretName && (resource.spec.clusterIssuer || resource.spec.issuer)) {
      tlsSecretName = `${resource.metadata.name}-tls`;
    }
    else {
      tlsSecretName = resource.spec.tlsSecretName;
    }

    const ingress: KubernetesObject = dropUndefined({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        annotations: {
          ...resource.spec.ingressAnnotations,
          ...(resource.spec.clusterIssuer ? { "cert-manager.io/cluster-issuer": resource.spec.clusterIssuer } : {}),
          ...(resource.spec.issuer ? { "cert-manager.io/issuer": resource.spec.issuer } : {}),
        },
      },
      spec: {
        ingressClassName: resource.spec.ingressClass ?? "nginx",
        rules: [resource.spec.host, ...(resource.spec.extraHosts || [])].map((host) => ({
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
            hosts: [resource.spec.host, ...(resource.spec.extraHosts || [])],
            secretName: tlsSecretName,
          }]
          : undefined,
      },
    });

    return Promise.resolve(dropUndefined([secret, deployment, service, ingress]));
  }
}

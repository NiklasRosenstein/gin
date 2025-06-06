import { type Gin, type KubernetesObject, type ObjectMeta, type ResourceAdapter, SecretValue } from "@gin/core";
import type { ArgoCDChartValues, IngressConfig } from "./values.ts";
import type { HelmChart } from "@gin/helm-v1alpha1";
import { deepClone } from "@gin/core/util";

// Imports for {@links}
// deno-lint-ignore no-unused-vars
import type { SecretProvider } from "@gin/core";

/**
 * This resource is a fully typed wrapper around the ArgoCD Helm chart with some bonuses.
 */
export interface ArgoCDDeployment extends KubernetesObject {
  apiVersion: "argocd.gin.jsr.io/v1alpha1";
  kind: "ArgoCDDeployment";

  /**
   * The name and namespace of the ArgoCD deployment are fixed to `argocd`.
   */
  metadata: ObjectMeta & {
    name: "argocd";
    namespace: "argocd";
  };

  spec: ArgoCDDeploymentSpec;
}

/**
 * Type for {@link ArgoCDDeployment#spec}.
 */
export interface ArgoCDDeploymentSpec {
  /**
   * Reference to the Helm chart to use for ArgoCD. The defaults should work in 99% of cases, but if you are in
   * a special environment (e.g. air-gapped), you can override the chart reference. A version must always be
   * explicitly set.
   */
  chart: {
    repository?: string;
    chart?: string;
    version: string;
  };

  /**
   * The configuration options in this field server as a convenient short-hand for the most common configuration
   * options. All of the same settings can be configured in the {@link ArgoCDDeploymentSpec#values} field as well,
   * just sometimes a little more complicated.
   */
  common: CommonConfig;

  /**
   * The values for the Helm chart. Configuration options defined with {@link ArgoCDDeploymentSpec#common} are
   * merged over the values in this field.
   */
  values?: ArgoCDChartValues;
}

export interface CommonConfig {
  adminPassword: {
    /**
     * Configure the password for the `admin` user in the ArgoCD server. This field is required. You can safe
     * hard-code a bcrypted password here, or load a secret value using a {@link SecretProvider} and encode the
     * value at runtime using [jsr:@stdext/crypto/hash/bcrypt](https://jsr.io/@stdext/crypto).
     */
    bcryptHash: string;

    /**
     * The modification timestamp of the password lets ArgoCD know when the password has changed and needs to
     * be updated in the `admin` user. Updating this value is cumbersome, so if you don't specify a value, we
     * will automatically calculate a timestamp based on the value of {@link bcryptHash}. The resulting timestamp
     * will not mean anything, but it will ensure that the password is updated.
     *
     * The timestamp format must be like `YYYY-MM-DDTHH:mm:ssZ`, e.g. `2023-10-01T12:00:00Z`.
     */
    mtime?: string;
  };

  ssh?: {
    /**
     * Override the default known hosts from the ArgoCD chart. The default includes `ssh.github.com`, `github.com`,
     * `bitbucket.org`, `ssh.dev.azure.com` and `vs-ssh.visualstudio.com`. If you want to add more hosts to this
     * list, use {@link extraHosts} instead.
     */
    knownHosts?: string[];

    /**
     * Add additional hosts to the known hosts list.
     */
    extraHosts?: string[];
  };

  ingress?: IngressConfig;

  configManagementPlugins?: ConfigManagementPluginSpec[];
}

export interface ConfigManagementPluginSpec {
  /**
   * The name of the CMP. This is used as the container name, but does not otherwise have any relevance. Still,
   * it is good practice to use the ArgoCD plugin name, which is usually in the form of `@{name}-@{version}`, e.g.
   * `gin-v1`.
   */
  name: string;

  /**
   * The container image of the CMP. Prefer an image that uses a version of the `argocd` binary that matches
   * the server version.
   */
  image: string;

  /**
   * Defaults to `"IfNotPresent"`.
   */
  imagePullPolicy?: "Always" | "IfNotPresent" | "Never";

  /**
   * Environment variables to set in the container. Note: If you want to set a secret value, use {@link secretEnv}
   * as it will ensure a `Secret` resource is created and `envFrom` is used on the container instead.
   */
  env?: Record<string, string>;

  /**
   * Secret environment variables to set in the container. This will create a `Secret` resource with the
   * environment variables and use `envFrom` to set them in the container.
   */
  secretEnv?: Record<string, SecretValue<string>>;
}

export class ArgoCDDeploymentAdapter implements ResourceAdapter<ArgoCDDeployment> {
  validate(_gin: Gin, _resource: ArgoCDDeployment): Promise<void> {
    return Promise.resolve();
  }

  generate(_gin: Gin, resource: ArgoCDDeployment): Promise<KubernetesObject[]> {
    const { metadata, spec } = resource;

    if (metadata.name !== "argocd" || metadata.namespace !== "argocd") {
      throw new Error("ArgoCDDeployment metadata.name and metadata.namespace must be 'argocd'");
    }
    if (!spec.chart.version) {
      throw new Error("ArgoCDDeployment spec.chart.version must be set");
    }

    const values = spec.values ? deepClone(spec.values) : {};
    const common = spec.common;

    values.configs = values.configs || {};
    values.configs.secret = values.configs.secret || {};
    values.configs.secret.argocdServerAdminPassword = SecretValue.of(common.adminPassword.bcryptHash);
    if (common.adminPassword.mtime) {
      values.configs.secret.argocdServerAdminPasswordMtime = common.adminPassword.mtime;
    }
    else {
      // Calculate a number from the adminPassword.bcryptHash between 0 and the maximum timestamp value.
      const hash = common.adminPassword.bcryptHash;
      const hashNumber = Array.from(hash).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const maxTimestamp = 253402300799; // 9999-12-31T23:59:59Z in seconds
      values.configs.secret.argocdServerAdminPasswordMtime = new Date(hashNumber % maxTimestamp * 1000).toISOString();
    }

    if (common.ssh?.knownHosts) {
      values.configs.ssh = values.configs.ssh || {};
      values.configs.ssh.knownHosts = common.ssh.knownHosts.join("\n");
    }

    if (common.ssh?.extraHosts) {
      values.configs.ssh = values.configs.ssh || {};
      values.configs.ssh.extraHosts = common.ssh.extraHosts.join("\n");
    }

    if (common.ingress) {
      values.server = values.server || {};
      values.server.ingress = common.ingress;
    }

    const secrets: KubernetesObject[] = [];
    if (common.configManagementPlugins) {
      // Starting with v2.4, do NOT mount the same tmp volume as the repo-server container. The filesystem separation helps
      // mitigate path traversal attacks. See
      // https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/#register-the-plugin-sidecar
      values.repoServer = values.repoServer || {};
      values.repoServer.volumes = values.repoServer.volumes || [];
      values.repoServer.volumes.push({
        name: "cmp-tmp",
        emptyDir: {},
      });

      values.repoServer.extraContainers = values.repoServer.extraContainers || [];
      for (const cmp of common.configManagementPlugins) {
        values.repoServer.extraContainers.push({
          name: cmp.name,
          image: cmp.image,
          imagePullPolicy: cmp.imagePullPolicy || "IfNotPresent",
          securityContext: {
            runAsNonRoot: true,
            runAsUser: 999,
          },
          env: Object.entries(cmp.env || {}).map(([key, value]) => ({
            name: key,
            value: value,
          })),
          envFrom: cmp.secretEnv && Object.keys(cmp.secretEnv).length > 0
            ? [{
              secretRef: {
                name: `argocd-cmp-${cmp.name}`,
              },
            }]
            : [],
          volumeMounts: [
            {
              name: "cmp-tmp",
              mountPath: "/tmp",
            },
            {
              name: "plugins",
              mountPath: "/home/argocd/cmp-server/plugins",
            },
            {
              name: "var-files",
              mountPath: "/var/run/argocd",
            },
          ],
        });

        if (cmp.secretEnv && Object.keys(cmp.secretEnv).length > 0) {
          secrets.push({
            apiVersion: "v1",
            kind: "Secret",
            metadata: {
              name: `argocd-cmp-${cmp.name}`,
              namespace: "argocd",
            },
            type: "Opaque",
            data: Object.fromEntries(
              Object.entries(cmp.secretEnv).map(([key, value]) => [key, value.secretAsBase64()]),
            ),
          });
        }
      }
    }

    const helmChart: HelmChart<ArgoCDChartValues> = {
      apiVersion: "helm.gin.jsr.io/v1alpha1",
      kind: "HelmChart",
      metadata: {
        name: "argocd",
        namespace: "argocd",
      },
      spec: {
        repository: spec.chart.repository || "oci://ghcr.io/argoproj/argo-helm",
        chart: spec.chart.chart || "argo-cd",
        version: spec.chart.version,
        values: values,
      },
    };

    return Promise.resolve([helmChart, ...secrets]);
  }
}

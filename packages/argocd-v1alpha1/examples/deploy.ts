/**
 * This example deploys ArgoCD alongside a Git repository credential.
 */

import { Gin, SecretValue } from "jsr:@gin/core";
import type { ArgoCDDeployment } from "jsr:@gin/argocd-v1alpha1";
import type { Repository } from "jsr:@gin/argocd-v1alpha1/crds";

new Gin().run((gin) => {
  gin.emit<ArgoCDDeployment>({
    apiVersion: "argocd.gin.jsr.io/v1alpha1",
    kind: "ArgoCDDeployment",
    metadata: {
      name: "argocd",
      namespace: "argocd",
    },
    spec: {
      // Explicitly specify the ArgoCD Helm chart version to use. The version field is required, so you
      // don't get surprised by a new version of the Helm chart being used by a newer version of the package.
      chart: {
        version: "8.0.14",
      },

      // The configuration in this field is provided as useful shortcuts to common configuration parameters
      // in the Helm chart values which are fully exposed in the `.spec.values` field. Options set in this
      // field take precedence over (or are merged with) corresponding fields in `.spec.values`.
      common: {
        // Configure the admin user credentials. You may hardcode a bcrypt hash here, or load a password
        // from a `@gin/core` {@link SecretProvider} and encrypt it with `jsr:@stdext/crypto/hash/bcrypt`.
        adminPassword: {
          bcryptHash: "$2b$12$1ykn5sGxWBPnDs89/pNukOFdRZ2oC86CvoJj1880mmH0GwbnA5Z2q", // "password"
        },

        // Configure SSH host keys here that ArgoCD will trust. You can get those with `ssh-keyscan $HOST 2>/dev/null`.
        ssh: {
          knownHosts: [
            "github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=",
            "github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q4zMjA2n1nGrlTDkzwDCsw+wqFPGQA179cnfGWOWRVruj16z6XyvxvjJwbz0wQZ75XK5tKSb7FNyeIEs4TT4jk+S4dhPeAUC5y+bDYirYgM4GC7uEnztnZyaVWQ7B381AK4Qdrwt51ZqExKbQpTUNn+EjqoTwvqNj4kqx5QUCI0ThS/YkOxJCXmPUWZbhjpCg56i+2aB6CmK2JGhn57K5mj0MNdBXA4/WnwH6XoPWJzK5Nyu2zB3nAZp+S5hpQs+p1vN1/wsjk=",
            "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl",
          ],
        },

        // Configure CMPs that are added to the `repo-server` as sidecar containers. This exmaple adds the `gin-v1`
        // plugin that allows you to have ArgoCD Applications generate Kubernetes resources using Gin (or, more
        // correctly, any TypeScript file). This is a short-hand to setting `.spec.values.repoServer.extraContainers`.
        configManagementPlugins: [
          {
            name: "gin-v1",
            image: "ghcr.io/niklasrosenstein/gin/gin-argocd:latest", // Pin this to a specific version.
            env: {},
            secretEnv: {},
          },
        ],

        // Configuure the ingress for the ArgoCD server.
        ingress: {
          enabled: true,
          ingressClassName: "nginx",
          hostname: "argocd.internal",
        },
      },

      // Raw values for the Helm chart.
      values: {
        crds: {
          install: true,
          keep: true,
        },
        configs: {
          cm: {
            "exec.enabled": true, // See https://argo-cd.readthedocs.io/en/stable/operator-manual/web_based_terminal/
          },
          params: {
            "server.insecure": true, // Don't use a self-signed TLS certificate in the ArgoCD server Pod.
          },
        },
        dex: {
          enabled: false,
        },
      },
    },
  });

  gin.emit<Repository>({
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: "my-repo",
      namespace: "argocd",
      labels: {
        "argocd.argoproj.io/secret-type": "repository",
      },
    },
    stringData: {
      name: "argocd-repo",
      project: "default",
      type: "git",
      url: "ssh://git@github.com/acme-org/argocd-repo.git",
      sshPrivateKey: SecretValue.of("---BEGIN ..."),
    },
  });
});

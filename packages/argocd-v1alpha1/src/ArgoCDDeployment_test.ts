import { ArgoCDDeploymentAdapter } from "./ArgoCDDeployment.ts";
import type { ArgoCDChartValues } from "./values.ts";
import { _, Gin, SecretValue } from "@gin/core";
import { assertEquals } from "@std/assert";
import type { HelmChart } from "@gin/helm-v1alpha1";

Deno.test("ArgoCDDeploymentAdapter", async () => {
  const adapter = new ArgoCDDeploymentAdapter();
  const results = await adapter.generate(new Gin("bare"), {
    apiVersion: "argocd.gin.jsr.io/v1alpha1",
    kind: "ArgoCDDeployment",
    metadata: {
      name: "argocd",
      namespace: "argocd",
    },
    spec: {
      chart: {
        version: "8.0.14",
      },
      common: {
        adminPassword: {
          bcryptHash: "$2a$10$EIX9z5Z1b7f8Q0j3e4Y5Uu",
        },
        configManagementPlugins: [
          {
            name: "cmp-example",
            image: "ghcr.io/example/cmp-example:latest",
            env: {
              EXAMPLE_ENV_VAR: "example-value",
            },
            secretEnv: {
              SECRET_EXAMPLE: SecretValue.of("secret-value"),
            },
          },
        ],
        ingress: {
          enabled: true,
          ingressClassName: "nginx",
          hostname: "argocd.local",
        },
      },
      values: {
        server: {
          extraArgs: ["--verbose"],
        },
      },
    },
  });

  //   console.log(JSON.stringify(results, null, 2));
  assertEquals(results.length, 2);

  const chart = results.find((r) => r.kind === "HelmChart");
  assertEquals(
    chart,
    _<HelmChart<ArgoCDChartValues>>({
      "apiVersion": "helm.gin.jsr.io/v1alpha1",
      "kind": "HelmChart",
      "metadata": {
        "name": "argocd",
        "namespace": "argocd",
      },
      "spec": {
        "repository": "oci://ghcr.io/argoproj/argo-helm",
        "chart": "argo-cd",
        "version": "8.0.14",
        "values": {
          "server": {
            "extraArgs": [
              "--verbose",
            ],
            "ingress": {
              "enabled": true,
              "ingressClassName": "nginx",
              "hostname": "argocd.local",
            },
          },
          "configs": {
            "secret": {
              "argocdServerAdminPassword": SecretValue.of("$2a$10$EIX9z5Z1b7f8Q0j3e4Y5Uu"),
              "argocdServerAdminPasswordMtime": "1970-01-01T00:34:07.000Z",
            },
          },
          "repoServer": {
            "volumes": [
              {
                "name": "cmp-tmp",
                "emptyDir": {},
              },
            ],
            "extraContainers": [
              {
                "name": "cmp-example",
                "image": "ghcr.io/example/cmp-example:latest",
                "imagePullPolicy": "IfNotPresent",
                "env": [
                  {
                    "name": "EXAMPLE_ENV_VAR",
                    "value": "example-value",
                  },
                ],
                "envFrom": [
                  {
                    "secretRef": {
                      "name": "argocd-cmp-cmp-example",
                    },
                  },
                ],
                "securityContext": {
                  "runAsNonRoot": true,
                  "runAsUser": 999,
                },
                "volumeMounts": [
                  {
                    "mountPath": "/tmp",
                    "name": "cmp-tmp",
                  },
                  {
                    "mountPath": "/home/argocd/cmp-server/plugins",
                    "name": "plugins",
                  },
                  {
                    "mountPath": "/var/run/argocd",
                    "name": "var-files",
                  },
                ],
              },
            ],
          },
        },
      },
    }),
  );

  const secret = results.find((r) => r.kind === "Secret");
  assertEquals(secret, {
    "apiVersion": "v1",
    "kind": "Secret",
    "metadata": {
      "name": "argocd-cmp-cmp-example",
      "namespace": "argocd",
    },
    "type": "Opaque",
    "data": {
      "SECRET_EXAMPLE": "c2VjcmV0LXZhbHVl",
    },
  });
});

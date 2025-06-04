import { assertEquals, assertRejects } from "@std/assert";
import { WebAppConverter } from "./webapp.ts";
import { Gin, SecretValue } from "@gin/core";
import type { WebApp } from "./webapp.ts";

function createWebApp(overrides: Partial<WebApp> = {}): WebApp {
  return {
    apiVersion: "webapp.gin.jsr.io/v1alpha1",
    kind: "WebApp",
    metadata: {
      name: "test-webapp",
      namespace: "default",
      ...((overrides.metadata as object) || {}),
    },
    spec: {
      image: "nginx:latest",
      hostname: "example.com",
      replicas: 3,
      ...((overrides.spec as object) || {}),
    },
    ...overrides,
  };
}

Deno.test("WebAppConverter - should throw error when namespace is missing", async () => {
  const converter = new WebAppConverter();
  const gin = new Gin("bare");

  const webapp = createWebApp({ metadata: { name: "test-webapp" } });
  delete webapp.metadata.namespace;

  await assertRejects(
    () => converter.validate(gin, webapp),
    Error,
    "WebApp metadata.namespace is required",
  );
});

Deno.test("WebAppConverter - should throw error when replicas is less than 1", async () => {
  const converter = new WebAppConverter();
  const gin = new Gin("bare");

  const webapp = createWebApp({ spec: { image: "nginx:latest", hostname: "example.com", replicas: 0 } });

  await assertRejects(
    () => converter.validate(gin, webapp),
    Error,
    "WebApp spec.replicas must be at least 1",
  );
});

Deno.test("WebAppConverter - should pass validation with valid WebApp", async () => {
  const converter = new WebAppConverter();
  const gin = new Gin("bare");

  const webapp = createWebApp();

  // Should not throw
  await converter.validate(gin, webapp);
});

Deno.test("WebAppConverter - should generate deployment, service, and ingress", async () => {
  const converter = new WebAppConverter();
  const gin = new Gin("bare");

  const webapp = createWebApp({
    metadata: { name: "example-webapp", namespace: "default" },
    spec: {
      image: "nginxinc/nginx-unprivileged:stable-alpine",
      replicas: 3,
      hostname: "example.com",
      secretEnv: {
        API_KEY: SecretValue.of("MY_SECRET_API_KEY"),
      },
    },
  });

  const resources = await converter.generate(gin, webapp);

  assertEquals(resources.length, 4);

  const deployment = resources.find((r) => r.kind === "Deployment");
  const service = resources.find((r) => r.kind === "Service");
  const ingress = resources.find((r) => r.kind === "Ingress");
  const secret = resources.find((r) => r.kind === "Secret");

  assertEquals(deployment !== undefined, true);
  assertEquals(service !== undefined, true);
  assertEquals(ingress !== undefined, true);
  assertEquals(secret !== undefined, true);
});

Deno.test("WebAppConverter - should generate deployment with correct configuration", async () => {
  const converter = new WebAppConverter();
  const gin = new Gin("bare");

  const webapp = createWebApp({
    metadata: { name: "example-webapp", namespace: "default" },
    spec: {
      image: "nginxinc/nginx-unprivileged:stable-alpine",
      replicas: 3,
      hostname: "example.com",
      port: 3000,
      env: { NODE_ENV: "production" },
    },
  });

  const resources = await converter.generate(gin, webapp);
  const deployment = resources.find((r) => r.kind === "Deployment");
  const service = resources.find((r) => r.kind === "Service");
  const ingress = resources.find((r) => r.kind === "Ingress");

  assertEquals(deployment, {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: "example-webapp",
      namespace: "default",
    },
    spec: {
      replicas: 3,
      selector: {
        matchLabels: {
          "webapp.gin.jsr.io/v1alpha1.WebApp": "example-webapp",
        },
      },
      template: {
        metadata: {
          labels: {
            "webapp.gin.jsr.io/v1alpha1.WebApp": "example-webapp",
          },
        },
        spec: {
          containers: [
            {
              name: "web",
              image: "nginxinc/nginx-unprivileged:stable-alpine",
              ports: [{ containerPort: 3000 }],
              env: [
                {
                  name: "NODE_ENV",
                  value: "production",
                },
              ],
              securityContext: {
                allowPrivilegeEscalation: false,
                runAsNonRoot: true,
              },
            },
          ],
        },
      },
    },
  });

  assertEquals(service, {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: "example-webapp",
      namespace: "default",
    },
    spec: {
      selector: {
        "webapp.gin.jsr.io/v1alpha1.WebApp": "example-webapp",
      },
      ports: [
        {
          name: "http",
          port: 3000,
          targetPort: 3000,
        },
      ],
      type: "ClusterIP",
    },
  });

  assertEquals(ingress, {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: "example-webapp",
      namespace: "default",
      annotations: {},
    },
    spec: {
      ingressClassName: "nginx",
      rules: [
        {
          host: "example.com",
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: "example-webapp",
                    port: { name: "http" },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  });
});

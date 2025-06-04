# Gin &ndash; A Typesafe Kubernetes Templating Engine

[sec]: https://docs.deno.com/runtime/fundamentals/security/
[@gin]: https://jsr.io/@gin

Gin is a templating engine for Kubernetes. It leverages TypeScript's type system to provide a strongly typed interface
for defining Kubernetes resources, as well as [Deno's security model][sec] to ensure secure execution and TypeScript
packages for reusability.

## Features

- **Type Safety**: Define Kubernetes resources with TypeScript types, ensuring correctness at compile time.
- **Reusable Packages**: Create reusable, high-level components and consume them as TypeScript packages from JSR.io,
  your private registry or the local filesystem.
- **Security**: Run Gin pipelines in a secure environment with Deno's runtime, which provides a sandboxed execution
  context.
- **Standard Library**: The [`@gin` namespace on JSR.io][@gin] provides a standard library of useful high-level
  components for common Kubernetes tasks, such as deploying web applications, managing databases, and more.

## Why should I use Gin?

Gin provides a unique way to define reusable components. It is designed to make Kubernetes resource management easier
and more maintainable, whether you're an enthusiast, a small shop or a large enterprise.

Especially for large teams, it allows one to ensure consistency and best practices across their Kubernetes deployments
while exposing a minimal configuration surface to developers.

## Basic Usage

A Gin project is basically just a TypeScript file that uses the `@gin/core` package plus any additional packages that
provide reusable components. Here's a simple example of how to deploy a simple web application using Gin's
`@gin/webapp-v1alpha1` package:

```ts
// webapp.ts
import { Gin } from "jsr:@gin/core";
import { WebApp } from "jsr:@gin/webapp-v1alpha1";

new Gin().run((gin) => {
  gin.emit<WebApp>({
    apiVersion: "webapp.gin.jsr.io/v1alpha1",
    kind: "WebApp",
    metadata: {
      name: "example-webapp",
      namespace: "default",
    },
    spec: {
      image: "nginxinc/nginx-unprivileged:stable-alpine",
      replicas: 3,
      host: "example.com",
      clusterIssuer: "letsencrypt-prod",
    },
  });
});
```

This code produces a `Deployment`, `Service` and `Ingress` resource including a `cert-manager.io/cluster-issuer`
annotation, all defined in a strongly typed way. Simply run

```console
$ deno run webapp.ts
```

## Release Process

Each package in this repository is independently versioned and released. To release a new version, ensure that its
`version` field in `deno.json` is updated and then create and push a tag in the format `{pkg}@v{version}`. If something
goes wrong during the publish step, the tag can be moved to a new commit and the release can be retried.

The release script does all these steps for you.

```console
$ deno run --allow-all ./scripts/release.ts {pkg}@v{version}
```

## Developemnt

- All `packages/*/deno.json` files need a `test-this` task that is used by the `all` task in the root `deno.json` as
  well as in `scripts/picky-publisher.ts` to test the package before publishing.

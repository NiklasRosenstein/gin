# `@gin` is a typesafe Kubernetes templating engine

[sec]: https://docs.deno.com/runtime/fundamentals/security/
[@gin]: https://jsr.io/@gin
[Deno]: https://deno.com
[webapp]: https://jsr.io/@gin/webapp-v1alpha1

Gin is a templating engine for Kubernetes based on [Deno] that leverages TypeScript's powerful type system to turn
Kubernetes deployment configuration type-safe.

Check out [`@gin` on JSR.io][@gin] for more information, examples and documentation.

## Why use Gin?

- **Type Safety**: Define Kubernetes resources with TypeScript types, ensuring correctness at compile time.
- **Reusable Packages**: Create reusable, high-level components as TypeScript packages, or anything that [Deno] can
  import from.
- **Security**: Run Gin pipelines in a secure environment with Deno's runtime, which provides a sandboxed execution
  context.

## Getting started

The following is a basic example that makes use of the [`@gin/webapp-v1alpha1`][webapp] package to define a simple
stateless web application with a `Deployment`, `Service`, and `Ingress` resource. For more complex examples, check out
the [examples/](./examples/) directory and the [`@gin` scope on JSR.io][@gin].

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

> Put this code into a `webapp.ts` file and simply run `deno run webapp.ts` to see the generated Kubernetes resources.
> You can pass the `-m` flag to keep the Gin-internal metadata in the output, which is useful for debugging, and the
> `-p` flag to keep the `WebApp` custom resource in the output as well.

## Development

This is a mono repository that contains all packages in the [`@gin` scope on JSR.io][@gin]. All packages are
independently versioned and released.

### Format, lint, check and test

Before committing code, it's a good idea to run `deno task all`. It is a task in the workspace root that formats all
code, runs linting with fixes where possible, runs type checks and then all tests.

Packages that require special permissions for the Deno runtime must define a `test-this` task which runs `deno test`
with the corresponding `--allow-*` flags. Packages that do not define this task are simply tested with `deno test`.

### Release process

The `./scripts/release.ts` script automates the release process for packages in this repository. It aids in the updating
of the `version` field in `deno.json`, creating a tag in the format `{pkg}@v{version}`, and pushing them to the
repository.

When a tag is pushed, the corresponding package is automatically published to JSR.

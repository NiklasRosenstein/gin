This package provides the `WebApp` Gin custom resource, a straightforward abstraction for defining stateless web
applications. When used, it generates a `Deployment`, `Service`, and `Ingress` resource, and also creates a `Secret` if
the `.spec.secretEnv` field is specified.

[cert-manager]: https://cert-manager.io/

## Basic Example

```ts
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

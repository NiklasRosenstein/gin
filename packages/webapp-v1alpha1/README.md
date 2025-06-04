This package provides a `WebApp` Gin custom resource that is a simple abstraction for describing stateless Web
applications that will unfold into a `Deployment`, `Service`, and `Ingress` resource, as well as a `Secret` if the
`.spec.secretEnv` field is set.

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

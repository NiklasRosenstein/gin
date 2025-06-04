# @gin/webapp-v1alpha1

[cert-manager]: https://cert-manager.io/

This package provides the `WebApp` resource that is a simple abstraction for describing stateless Web applications.

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

This package provides the core functionality of the Gin framework, a type safe template engine for Kubernetes.

## Getting started

The following is a basic example that makes use of a reusable component from the Gin standard library to deploy a web
application. Running this code will produce a corresponding `Deployment`, `Service`, and `Ingress` resource.

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

> You can add the `-m` option to keep Gin metadata attached to the Kubernetes resources in tact, which is useful for
> debugging when you need to understand how a resource in the final output was generated. Also add the `-p` option to
> emit Gin custom resources as well.

Check out the Gin packages on [JSR.io](https://jsr.io/@gin).

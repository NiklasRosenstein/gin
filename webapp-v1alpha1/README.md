# @nyl-core/webapp-v1alpha1

[cert-manager]: https://cert-manager.io/

This package provides the `WebApp` resource that is a simple abstraction for a stateless Web applications with support
for various third-party Kubernetes integrations such as [cert-manager].

## Usage

```ts
import { Nyl } from "@nyl/core";
import { WebApp } from "@nyl-contrib/webapp-v1alpha1";

const nyl = new Nyl();

nyl.add(WebApp, {
  metadata: {
    name: "my-webapp",
    namespace: "default",
  },
  spec: {
    replicas: 3,
    hostname: "example.com",
    image: "nginx:latest",
    port: 80,
    clusterIssuer: "letsencrypt-prod",
  },
});
```

This package provides a wrapper for the official ArgoCD Helm chart, exposing a clean API for the most important
configuration options and some convenient extras, as well as exposing access to the raw Helm chart values.

## Features

- Easily bootstrap ArgoCD and then have it manage itself in your Kubernetes cluster.
- Configure [ConfigManagementPlugins][ConfigManagementPlugins] with a simple API.
- Templates for ArgoCD `Application` and `ApplicationSet` resources for various use cases, as well as configuration for
  [Private repositories][Private repositories] (WIP).

> **Note**: Unless you want to use this package solely for bootstrapping ArgoCD, you likely want to install the
> [`gin-argocd`][gin-argocd] CMP, which allows you to invoke Deno scripts to generate Kubernetes resources and thus make
> use of Gin.

[ConfigManagementPlugins]: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
[Private repositories]: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
[gin-argocd]: https://ghcr.io/niklasrosenstein/gin/gin-argocd

## Usage example

For a complete example, see [`examples/deploy.ts`](examples/deploy.ts).

```ts
import { Gin } from "jsr:@gin/core";
import { ArgoCDDeployment } from "jsr:@gin/argocd-v1alpha1";
import { hash } from "jsr:@stdext/crypto/hash/bcrypt";

new Gin().run((gin) => {
  gin.emit<ArgoCDDeployment>({
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
          bcryptHash: "$2b$12$1ykn5sGxWBPnDs89/pNukOFdRZ2oC86CvoJj1880mmH0GwbnA5Z2q", // "password"
        },
      },
      values: {
        crds: {
          install: true,
          keep: true,
        },
      },
    },
  });
});
```

## Chart compatibility

This package is known to be compatible with the following ArgoCD Helm chart versions. If there have been no
groundbreaking changes in the Helm chart, it should also be compatible with newer versions.

- 8.0.14

## Dependencies

This package depends on [`@gin/helm-v1alpha1`](https://jsr.io/@gin/helm-v1alpha1), hence it has all the same Deno
permission requirements when executed.

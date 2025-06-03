# @gin/helm-v1alpha1

This package provides a Gin custom resource for render Helm charts. It invokes the `helm pull` command to fetch the
chart, then `helm template` to render the chart and return the resulting Kubernetes manifests to Gin.

## Usage

```ts
import { Gin } from "jsr:@gin/core";
import { HelmChart } from "jsr:@gin/helm-v1alpha1";

new Gin().run((gin) => {
  gin.emit<HelmChart>({
    apiVersion: "helm.gin.jsr.io/v1alpha1",
    kind: "HelmChart",
    metadata: {
      name: "cert-manager",
      namespace: "cert-manager"
    },
    spec: {
      repository: "https://charts.jetstack.io",
      chart: "cert-manager",
      version: "1.17.2",
      values: {
        installCRDs: true
      }
    }
  });
});
```

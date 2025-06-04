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
      namespace: "cert-manager",
    },
    spec: {
      repository: "https://charts.jetstack.io",
      chart: "cert-manager",
      version: "1.17.2",
      values: {
        installCRDs: true,
      },
    },
  });
});
```

## Supported Chart Repositories

The following chart repository protocols are supported:

| Protocol              | Example                                                                 | Description                                                         |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `http://`, `https://` | `https://charts.jetstack.io`                                            | Standard HTTP(S) chart repositories.                                |
| `oci://`              | `oci://ghcr.io/jetstack`                                                | OCI-compliant chart repositories.                                   |
| `file://`             | `file:///path/to/chart`                                                 | Local file system chart repositories.                               |
| `git+ssh://`          | `git+ssh://git@github.com/jetstack/cert-manager.git?path=deploy/charts` | Sparse check for a Git repositories using SSH.                      |
| `git+https://`        | `git+https://github.com/jetstack/cert-manager.git?path=deploy/charts`   | Sparse check for a Git repositories using SSH. Supports basic-auth. |

> **Important**: In all cases, the _chart name_ is not a part of the URL. It must be specified in the `spec.chart` field
> of the `HelmChart` resource.

## Deno Permissions

Note this package requires some Deno permissions to run, specifically:

| Permission         | Rationale                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `--allow-write`    | The chart values are rendered to disk before they are passed to the `helm` command.              |
| `--allow-run=helm` | This package uses the `helm` CLI to render charts. This permission is always required.           |
| `--allow-run=git`  | Required when referencing charts from a Git repository using the`git+(ssh\|https?)://` protocol. |
| `--allow-read`     | Required when referencing charts from a Git repository to check for folder existence.            |

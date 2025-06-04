# @gin/helm-v1alpha1

This package provides a Gin custom resource for render Helm charts. It invokes the `helm pull` command to fetch the
chart, then `helm template` to render the chart and return the resulting Kubernetes manifests to Gin.

## Usage

```ts
import { Gin } from "jsr:@gin/core";
import { HelmChart } from "jsr:@gin/helm-v1alpha1";

interface CertManagerValues {
  installCRDs: boolean;
}

new Gin().run((gin) => {
  gin.emit<HelmChart<CertManagerValues>>({
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

You can use the `UntypedHelmChart` type instead if you can't or don't want to spell out the interface for the Helm chart
values.

## Options

This Gin package exports a Gin module factory that expects options. These options are optional, but it is recommended to
consider configuring the options to suit your needs.

```ts
import { Gein } from "jsr:@gin/gin";
import { HelmOptions } from "jsr:@gin/helm-v1alpha1";

new Gin()
  .withOptions<HelmOptions>({
    type: "@gin/helm-v1alpha1",
    cacheDir: "path/to/cache/dir",
  })
  .run(async (gin) => {
    // ...
  });
```

Available options are:

| Option     | Type     | Default     | Description                                                                                        |
| ---------- | -------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `cacheDir` | `string` | `.gin/helm` | The directory where the Helm charts will be cached. This is useful for reusing charts across runs. |

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
| `--allow-run=helm` | This package uses the `helm` CLI to render charts. This permission is always required.           |
| `--allow-run=git`  | Required when referencing charts from a Git repository using the`git+(ssh\|https?)://` protocol. |
| `--allow-read`     | Required when referencing charts from a Git repository to check for folder existence.            |

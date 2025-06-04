This package provides the `HelmChart` Gin custom resource for rendering Helm charts. It uses the `helm pull` command to
fetch the chart and `helm template` to render it, returning the resulting Kubernetes manifests to Gin.

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

> Defining an interface for the Helm chart values is optional, but recommended for type safety and IDE autocompletion.
> The `HelmChart` type is generic and expects an interface for the chart values. If you don't define an interface, you
> can use `UntypedHelmChart` instead.

## Options

This package exports a Gin module factory that accepts options. While all options are optional, configuring them can
help tailor the behavior to your needs.

```ts
import { Gin } from "jsr:@gin/core";
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

Available options:

| Option     | Type     | Default           | Description                                                                     |
| ---------- | -------- | ----------------- | ------------------------------------------------------------------------------- |
| `cacheDir` | `string` | `.gin/cache/helm` | Directory where Helm charts are cached when pulled or cloned/checked out (Git). |

## Supported Chart Repositories

The following chart repository protocols are supported:

| Protocol              | Example                                                                 | Description                                                            |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `http://`, `https://` | `https://charts.jetstack.io`                                            | Standard HTTP(S) chart repositories.                                   |
| `oci://`              | `oci://ghcr.io/jetstack`                                                | OCI-compliant chart repositories.                                      |
| `file://`             | `file:///path/to/chart`                                                 | Local file system chart repositories.                                  |
| `git+ssh://`          | `git+ssh://git@github.com/jetstack/cert-manager.git?path=deploy/charts` | Sparse checkout for Git repositories using SSH.                        |
| `git+https://`        | `git+https://github.com/jetstack/cert-manager.git?path=deploy/charts`   | Sparse checkout for Git repositories using HTTPS. Supports basic-auth. |

> **Note**: The chart name is not part of the repository URL. Specify it in the `spec.chart` field of the `HelmChart`
> resource.

## Deno Permissions

This package requires the following Deno permissions:

| Permission         | Reason                                                                              |
| ------------------ | ----------------------------------------------------------------------------------- |
| `--allow-run=helm` | Required to invoke the `helm` CLI for rendering charts.                             |
| `--allow-run=git`  | Needed when referencing charts from a Git repository using the `git+(ssh            |
| `--allow-read`     | Needed to check for folder existence when referencing charts from a Git repository. |

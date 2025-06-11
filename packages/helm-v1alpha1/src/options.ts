import type { ModuleOptions } from "@gin/core";

export interface HelmOptions extends ModuleOptions {
  pkg: "@gin/helm-v1alpha1";

  /**
   * The directory where Helm charts and Git repositories will be cached. It is strongly recommended to specify a
   * persistent directory to avoid re-downloading Helm charts and Git repositories every time they are needed.
   *
   * If the `GIN_CACHE_DIR` environment variable is set, it will be used plus `/helm` appended to it. Note that the
   * variable must be readable by the Deno runtime, otherwise a warning will be logged (see {@link getGinCacheDir}).
   */
  cacheDir?: string;
}

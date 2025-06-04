import type { ModuleOptions } from "@gin/core";

export interface HelmOptions extends ModuleOptions {
  type: "@gin/helm-v1alpha1";

  /**
   * The directory where Helm charts and Git repositories will be cached. It is strongly recommended to specify a
   * persistent directory to avoid re-downloading Helm charts and Git repositories every time they are needed.
   * If not specified, a temporary directory will be used and a warning is logged. Note that cancelling the execution
   * of Deno while the temporary directory is being used may leave the directory behind.
   */
  cacheDir?: string;
}

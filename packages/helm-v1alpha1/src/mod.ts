import { Module } from "@gin/core";
import type { HelmOptions } from "./options.ts";
import { type HelmChart, HelmChartAdapter } from "./helmchart.ts";

export type { HelmOptions } from "./options.ts";
export { type HelmChart, HelmChartAdapter } from "./helmchart.ts";

import { createManagedTempDir } from "@gin/core/util";

export default async (options?: HelmOptions): Promise<Module> => {
  let cacheDir: string | undefined = options?.cacheDir ?? "gin-cache";
  if (!cacheDir) {
    console.warn(
      "HelmChartAdapter: No cache directory specified. Using a temporary directory for Helm charts and Git " +
        "repositories. It is strongly recommended to specify a persistent directory to avoid re-downloading " +
        "Helm charts and Git repositories every time the adapter is used.",
    );

    cacheDir = await createManagedTempDir("gin-helmchart-v1alpha1-");
  }

  return new Module("@gin/helm-v1alpha1")
    .withAdapter<HelmChart>(
      { apiVersion: "helm.gin.jsr.io/v1alpha1", kind: "HelmChart" },
      new HelmChartAdapter(cacheDir),
    );
};

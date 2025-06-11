import { getGinCacheDir, Module } from "@gin/core";
import type { HelmOptions } from "./options.ts";
import { HelmChartAdapter, type UntypedHelmChart } from "./helmchart.ts";

export type { HelmOptions } from "./options.ts";
export { type HelmChart, HelmChartAdapter, type UntypedHelmChart } from "./helmchart.ts";

export default async (options?: HelmOptions): Promise<Module> => {
  const cacheDir: string = options?.cacheDir || `${await getGinCacheDir()}/helm`;

  return new Module("@gin/helm-v1alpha1")
    .withAdapter<UntypedHelmChart>(
      { apiVersion: "helm.gin.jsr.io/v1alpha1", kind: "HelmChart" },
      new HelmChartAdapter(cacheDir),
    );
};

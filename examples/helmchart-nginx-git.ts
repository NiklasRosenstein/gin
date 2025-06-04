/**
 * This example demonstrates two major features of the `@gin/helm-v1alpha1` package:
 *
 * - Rendering a Helm chart stored in a Git repository.
 * - Type-checking the values passed to the Helm chart using TypeScript interfaces.
 *
 * This example needs to be run with `deno run --allow-read --allow-run=helm,git`.
 */

import { Gin } from "jsr:@gin/core";
import { HelmChart, HelmOptions } from "jsr:@gin/helm-v1alpha1";

interface IngressNginxValues {
  fullnameOverride?: string;
  nameOverride?: string;
  replicaCount?: number;
  controller?: {
    ingressClass?: string;
    ingressClassResource?: {
      name?: string;
      default?: string;
      controllerValue?: string;
    };
    nodeSelector?: Record<string, string>;
    service?: {
      type?: "ClusterIP" | "NodePort" | "LoadBalancer";
      loadBalancerIP?: string;
      annotations?: Record<string, string>;
    };
  };
  // ...
}

new Gin()
  .withOptions<HelmOptions>({
    pkg: "@gin/helm-v1alpha1",
    cacheDir: "./helm-cache",
  })
  .run((gin) => {
    gin.emit<HelmChart<IngressNginxValues>>({
      apiVersion: "helm.gin.jsr.io/v1alpha1",
      kind: "HelmChart",
      metadata: {
        name: "nginx",
        namespace: "default",
      },
      spec: {
        repository: "git+https://github.com/kubernetes/ingress-nginx?path=charts",
        chart: "ingress-nginx",
        version: "helm-chart-4.12.2",
        values: {
          replicaCount: 2,
        },
      },
    });
  });

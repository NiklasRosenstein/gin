import { Gin } from "@gin/core";
import { HelmChart, HelmOptions } from "@gin/helm-v1alpha1";

new Gin()
  .withOptions<HelmOptions>({
    type: "@gin/helm-v1alpha1",
  })
  .run((gin) => {
    gin.emit<HelmChart>({
      apiVersion: "helm.gin.jsr.io/v1alpha1",
      kind: "HelmChart",
      metadata: {
        name: "nginx",
        namespace: "default",
      },
      spec: {
        repository: "oci://registry-1.docker.io/bitnamicharts/nginx",
        chart: "nginx",
        version: "9.0.0",
        values: {
          service: {
            type: "LoadBalancer",
          },
        },
      },
    });
  });

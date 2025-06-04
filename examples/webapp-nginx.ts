/**
 * This example demonstrates how to use the `@gin/webapp-v1alpha1` package to deploy a simple web application.
 */

import { Gin } from "jsr:@gin/core";
import { WebApp } from "jsr:@gin/webapp-v1alpha1";

new Gin().run((gin) => {
  gin.emit<WebApp>({
    apiVersion: "webapp.gin.jsr.io/v1alpha1",
    kind: "WebApp",
    metadata: {
      name: "example-webapp",
      namespace: "default",
    },
    spec: {
      image: "nginxinc/nginx-unprivileged:stable-alpine",
      replicas: 3,
      hostname: "example.com",
      clusterIssuer: "letsencrypt-prod",
    },
  });
});

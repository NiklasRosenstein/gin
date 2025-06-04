import { Gin } from "jsr:@gin/core";
import { Sops } from "jsr:@gin/sops";
import { WebApp } from "jsr:@gin/webapp-v1alpha1";

const sops = new Sops({ path: import.meta.dirname + "/secrets.yaml" });

new Gin().run(async (gin) => {
  gin.emit<WebApp>({
    apiVersion: "webapp.gin.jsr.io/v1alpha1",
    kind: "WebApp",
    metadata: {
      name: "myapp",
      namespace: "default",
    },
    spec: {
      image: "myapp:latest",
      host: "myapp.example.com",
      secretEnv: {
        AWS_ACCESS_KEY_ID: await sops.getString("credentials.awsAccessKeyId"),
        AWS_SECRET_ACCESS_KEY: await sops.getString("credentials.awsSecretAccessKey"),
      },
    },
  });
});

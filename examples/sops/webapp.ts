import { Gin } from "jsr:@gin/core";
import { Sops } from "jsr:@gin/sops";
import { WebApp } from "jsr:@gin/webapp-v1alpha1";

const sops = new Sops({
  path: import.meta.dirname + "/secrets.yaml",
  // NOTE: Never hardcode this value in production code. Here it is just an otherwise unused private
  //       key for demonstration purposes so the example works with less setup on the user's side.
  //       The corresponding public key is: age1ggkd0kxmvtn8el5phk3wqjptpwk8v6g796f62ndgg73kszg2m5uqg4wypl
  agePrivateKey: "AGE-SECRET-KEY-1A2CLCDRM8NGTLPCE7UGF6US8RTN80GT9NNJ6Y7EHNG6D4DALFPQQX0XJ6Q",
});

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
      hostname: "myapp.example.com",
      secretEnv: {
        AWS_ACCESS_KEY_ID: await sops.getString("credentials.awsAccessKeyId"),
        AWS_SECRET_ACCESS_KEY: await sops.getString("credentials.awsSecretAccessKey"),
      },
    },
  });
});

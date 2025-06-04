/**
 * This example demonstrates the use of SOPS to inject secrets into Kubernetes resources generated with Gin.
 *
 * This example needs to be run with `deno run --allow-run=sops`.
 */

import { Gin } from "jsr:@gin/core";
import { Sops } from "jsr:@gin/sops";

const sops = new Sops({
  path: import.meta.dirname + "/sops.yaml",
  // NOTE: Never hardcode this value in production code. Here it is just an otherwise unused private
  //       key for demonstration purposes so the example works with less setup on the user's side.
  //       The corresponding public key is: age1ggkd0kxmvtn8el5phk3wqjptpwk8v6g796f62ndgg73kszg2m5uqg4wypl
  agePrivateKey: "AGE-SECRET-KEY-1A2CLCDRM8NGTLPCE7UGF6US8RTN80GT9NNJ6Y7EHNG6D4DALFPQQX0XJ6Q",
});

new Gin().run((gin) => {
});

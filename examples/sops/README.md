# examples/sops

This example demonstrates the use of SOPS to inject secrets into Kubernetes resources generated with Gin, passing
secrets into a Gin `webapp.gin.jsr.io/v1alpha1.WebApp` custom resource.

To run the example, use:

```console
$ export SOPS_AGE_KEY="AGE-SECRET-KEY-1A2CLCDRM8NGTLPCE7UGF6US8RTN80GT9NNJ6Y7EHNG6D4DALFPQQX0XJ6Q"
$ deno run --allow-run=sops webapp.ts
```

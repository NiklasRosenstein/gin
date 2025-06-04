# examples/sops

This example demonstrates the use of SOPS to inject secrets into Kubernetes resources generated with Gin, passing
secrets into a Gin `webapp.gin.jsr.io/v1alpha1.WebApp` custom resource.

To run the example, use:

```console
$ deno run --allow-run=sops webapp.ts
```

Gin provides a [ConfigManagementPlugin][ConfigManagementPlugin] for ArgoCD that allows you to execute TypeScript code
with Deno to generate Kubernetes resources. It is only remotely coupled to Gin by virtue of having some tools
pre-installed that are typically used by Gin pipelines, such as `helm` and `sops`.

[ConfigManagementPlugin]: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
[CMP-Sidecar]: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/#register-the-plugin-sidecar

## Installation

You must install the `gin-argocd` image as a sidecar container to your ArgoCD `repo-server` deployment. The sidecar
shares a UNIX socket with the main container through which it communicates with the plugin. This is more thoroughly
described in the [ArgoCD documentation][CMP-Sidecar].

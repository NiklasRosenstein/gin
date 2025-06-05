import { Module } from "@gin/core";
import { type ArgoCDDeployment, ArgoCDDeploymentAdapter } from "./ArgoCDDeployment.ts";
export { type ArgoCDDeployment, ArgoCDDeploymentAdapter } from "./ArgoCDDeployment.ts";

export default new Module("@gin/argocd-v1alpha1")
  .withAdapter<ArgoCDDeployment>(
    { apiVersion: "argocd.gin.jsr.io/v1alpha1", kind: "ArgoCDDeployment" },
    new ArgoCDDeploymentAdapter(),
  ) as Module;

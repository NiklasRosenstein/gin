import { Module } from "@gin/core";
import { type WebApp, WebAppConverter } from "./webapp.ts";
export { type WebApp, WebAppConverter } from "./webapp.ts";

export default new Module("@gin/webapp-v1alpha1")
  .withAdapter<WebApp>({ apiVersion: "webapp.gin.jsr.io/v1alpha1", kind: "WebApp" }, new WebAppConverter()) as Module;

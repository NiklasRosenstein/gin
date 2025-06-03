import { assertEquals } from "@std/assert";
import { Gin } from "@gin/core";

Deno.test(function testGinDefaultPackageMapping() {
  const gin = new Gin();
  assertEquals(gin.resolvePackageNameFromApiVersion("webapp.gin.jsr.io/v1alpha1"), "@gin/webapp-v1alpha1");
});

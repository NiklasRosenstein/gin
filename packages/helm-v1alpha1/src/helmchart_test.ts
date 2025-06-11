import { Gin } from "@gin/core";
import { HelmChartAdapter, type UntypedHelmChart } from "./helmchart.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { dirname, join } from "@std/path";
import { createManagedTempDir } from "@gin/core/utils";

const TESTDATA_DIR = join(dirname(dirname(import.meta.filename!)), "testdata");

async function createAdapter(): Promise<HelmChartAdapter> {
  // Using a temporary directory will avoid conflicts with other tests that might run in parallel.
  return new HelmChartAdapter(await createManagedTempDir("gin-helmchart-v1alpha1-test-"));
}

// Note: requires --allow-run=helm and --allow-write
Deno.test(async function testHelmChartFromRegistry() {
  const chart: UntypedHelmChart = {
    apiVersion: "helm.gin.jsr.io/v1alpha1",
    kind: "HelmChart",
    metadata: {
      name: "my-chart",
      namespace: "default",
    },
    spec: {
      repository: "https://kubernetes-sigs.github.io/external-dns",
      chart: "external-dns",
      version: "1.16.1",
      values: {
        provider: "cloudflare",
        cloudflare: {
          apiToken: "foobar",
          proxied: false,
        },
      },
    },
  };

  const adapter = await createAdapter();
  await adapter.validate(new Gin("bare"), chart);
  const resources = await adapter.generate(new Gin("bare"), chart);
  const resourceKinds = resources.map((r) => r.kind).sort();

  assertEquals(resourceKinds, [
    "ClusterRole",
    "ClusterRoleBinding",
    "CustomResourceDefinition",
    "Deployment",
    "Service",
    "ServiceAccount",
  ]);
});

// NOTE: We don't add a test for SSH because the test might block on user's computers waiting on input for
//       the SSH key passphrase or agent.

Deno.test(async function testHelmChartFromGitHttpsRepository() {
  const chart: UntypedHelmChart = {
    apiVersion: "helm.gin.jsr.io/v1alpha1",
    kind: "HelmChart",
    metadata: {
      name: "my-chart",
      namespace: "default",
    },
    spec: {
      repository: `git+https://github.com/kubernetes-sigs/external-dns.git?path=charts`,
      chart: "external-dns",
      version: "v0.16.1",
    },
  };

  const adapter = await createAdapter();
  await adapter.validate(new Gin("bare"), chart);
  const resources = await adapter.generate(new Gin("bare"), chart);
  const resourceKinds = resources.map((r) => r.kind).sort();

  assertEquals(resourceKinds, [
    "ClusterRole",
    "ClusterRoleBinding",
    "CustomResourceDefinition",
    "Deployment",
    "Service",
    "ServiceAccount",
  ]);
});

Deno.test(async function testHelmChartFromFileSystem() {
  const chart: UntypedHelmChart = {
    apiVersion: "helm.gin.jsr.io/v1alpha1",
    kind: "HelmChart",
    metadata: {
      name: "my-chart",
      namespace: "default",
    },
    spec: {
      repository: `file://${TESTDATA_DIR}`,
      chart: "my-chart",
      values: {
        replicaCount: 2,
      },
    },
  };

  const adapter = await createAdapter();
  await adapter.validate(new Gin("bare"), chart);
  const resources = await adapter.generate(new Gin("bare"), chart);
  const resourceKinds = resources.map((r) => r.kind).sort();

  assertEquals(resourceKinds, [
    "Deployment",
  ]);

  assertEquals(resources[0]!.spec.replicas, 2);
});

Deno.test(async function testHelmChartFromFileSystemCannotHaveVersionSet() {
  const chart: UntypedHelmChart = {
    apiVersion: "helm.gin.jsr.io/v1alpha1",
    kind: "HelmChart",
    metadata: {
      name: "my-chart",
      namespace: "default",
    },
    spec: {
      repository: `file://${TESTDATA_DIR}`,
      chart: "my-chart",
      version: "1.0.0", // This should not be allowed for file:// URLs
    },
  };

  const adapter = await createAdapter();
  await assertRejects(
    async () => await adapter.validate(new Gin("bare"), chart),
    Error,
    "HelmChart with file:// repository cannot have a version specified",
  );
});

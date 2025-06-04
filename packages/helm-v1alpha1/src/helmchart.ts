import type { Gin, KubernetesObject, ResourceAdapter } from "@gin/core";
import { parseAll, stringify } from "@std/yaml";
import { FileUrl, GitUrl, parseRepoUrl } from "./repourl.ts";
import { assert } from "@std/assert/assert";
import { join } from "@std/path/join";
import { reconcileSparseCheckout } from "./git.ts";

/**
 * This Gin custom resource represents a Helm chart that will be templated using the Helm CLI via the
 * `helm template` command. The `helm template` command is invoked with `--debug`, `--skip-tests`, `--include-crds`
 * and `--is-upgrade`.
 *
 * For evaluating in an isolated environment, the `KUBE_VERSION` and `KUBE_API_VERSIONS` environment variables should
 * be set to let Helm understand the capabilities for the target Kubernetes cluster.
 *
 * The Helm chart will inherit the `metadata.name` as the release name and the `metadata.namespace` as the release
 * namespace. The labels on the `HelmChart` resource will be propagated to the generated resources.
 */
export interface HelmChart<T> extends KubernetesObject {
  apiVersion: "helm.gin.jsr.io/v1alpha1";
  kind: "HelmChart";
  spec: {
    /**
     * The repository URL where the Helm chart is located. This may be an `http(s)://`, `oci://`, `file://`,
     * `git+ssh://` or `git+http(s)://` URL.
     *
     * Example URLs:
     * - `https://charts.example.com/my-charts`
     * - `oci://registry.example.com/my-charts`
     * - `file:///path/to/local/charts`
     * - `git+ssh://git@github.com/example/charts.git?path=charts`
     * - `git+https://gitub.com/example/charts.git?path=charts`
     */
    repository: string;

    /**
     * The name of the chart to install.
     */
    chart: string;

    /**
     * The version of the chart to install. If not specified, the latest version will be used as is the typical
     * Helm behaviour. The version must not be set for `file://` URLs. For `git+ssh://` or `git+https://` URLs,
     * the `version` can specify a branch, tag or commit SHA to use. Otherwise, the `HEAD` of the repository will be
     * used.
     */
    version?: string;

    /**
     * Values to pass to the Helm chart.
     */
    values?: T;
  };
}

/**
 * A variant of the {@link HelmChart} that is explicitly for its {@link HelmChart#spec.values} field. Use this when
 * you don't want to type the Helm chart values, or can't.
 */
// deno-lint-ignore no-explicit-any
export interface UntypedHelmChart extends HelmChart<{ [key: string]: any }> {
}

export class HelmChartAdapter implements ResourceAdapter<UntypedHelmChart> {
  constructor(public cacheDir: string) {}

  async validate(_gin: Gin, resource: UntypedHelmChart): Promise<void> {
    if (!resource.metadata.namespace) {
      throw new Error("HelmChart metadata.namespace is required");
    }

    // If the URL is not a plain string, then it's a special URL that we handle
    const repoUrl = parseRepoUrl(resource.spec.repository);
    if (repoUrl instanceof FileUrl && resource.spec.version !== undefined) {
      throw new Error("HelmChart with file:// repository cannot have a version specified");
    }

    // If a Git URL is provided and either rev or ref is used, the version cannot be specified.
    if (repoUrl instanceof GitUrl && (repoUrl.ref || repoUrl.rev) && resource.spec.version) {
      throw new Error(
        `HelmChart with git+${repoUrl.protocol}:// repository using the ?rev or ?ref query parameter ` +
          "cannot have a version specified",
      );
    }

    return await Promise.resolve();
  }

  async generate(_gin: Gin, resource: UntypedHelmChart): Promise<KubernetesObject[]> {
    const { repository, chart, version, values } = resource.spec;

    let chartPath: string;
    let repoArg: string[] = [];
    if (repository.startsWith("oci://")) {
      chartPath = `${repository}/${chart}`;
    } else if (repository.startsWith("file://")) {
      chartPath = repository.replace("file://", "") + `/${chart}`;
    } else if (repository.startsWith("https://") || repository.startsWith("http://")) {
      chartPath = chart;
      repoArg = ["--repo", String(repository)];
    } else if (repository.startsWith("git+")) {
      const repoUrl = parseRepoUrl(repository);
      assert(repoUrl instanceof GitUrl, "Expected GitUrl instance");

      const folderName = `${await repoUrl.getRepoHashKey()}-${repoUrl.getPathName().replace(/\//g, "-")}`;
      const bareRepoPath = join(this.cacheDir, "repos", folderName);
      const checkoutPath = join(
        this.cacheDir,
        "worktrees",
        folderName,
        `${resource.metadata.name}-${resource.metadata.namespace}`,
      );
      await reconcileSparseCheckout({
        worktreePath: checkoutPath,
        barePath: bareRepoPath,
        remote: repoUrl.getCloneUrl(),
        commitish: resource.spec.version || repoUrl.rev || repoUrl.ref || "HEAD",
        paths: [repoUrl.path || "."],
      });

      chartPath = join(checkoutPath, repoUrl.path || ".", chart);
    } else {
      throw new Error(`Unsupported repository protocol: ${repository}`);
    }

    const versionArg = version ? ["--version", String(version), "--devel"] : [];

    // Build helm template command
    const command: string[] = [
      "helm",
      "template",
      "--debug",
      "--skip-tests",
      "--include-crds",
      "--is-upgrade",
      "--dry-run=server",
      ...repoArg,
      ...versionArg,
      "--values",
      "-", // Use "-" to read values from stdin
      "--namespace",
      String(resource.metadata.namespace ?? "default"),
      String(resource.metadata.name ?? "release"),
      chartPath,
    ];

    // Run helm template using Deno.Command
    const proc = new Deno.Command("helm", {
      args: command.slice(1),
      stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    }).spawn();

    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(stringify(values || {})));
    await writer.close(); // Close the writer, which in turn closes stdin.

    const { code, stdout, stderr } = await proc.output();
    const stdoutStr = new TextDecoder().decode(stdout);
    if (code !== 0) {
      const stderrStr = new TextDecoder().decode(stderr);
      throw new Error(
        `Failed to generate resources using Helm.\nstdout:\n${stdoutStr}\nstderr:\n${stderrStr}`,
      );
    }

    // Parse YAML output
    const docs = (parseAll(stdoutStr) as unknown[]).filter((doc) => doc != null) as KubernetesObject[];

    // Add labels from resource.metadata.labels
    if (resource.metadata.labels) {
      for (const doc of docs) {
        doc.metadata = doc.metadata || {};
        doc.metadata.labels = { ...doc.metadata.labels, ...resource.metadata.labels };
      }
    }

    return docs; // TOOD: Need .filter(Boolean); ?
  }
}

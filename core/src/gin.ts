/**
 * This file provides the main entrypoint for a Gin pipeline to render Kubernetes manifests.
 */

import type { KubernetesObject } from "./mod.ts";
import { Module, type ResourceAdapter } from "./module.ts";
import { escape } from "@std/regexp/escape";
import { type Sink, StdoutSink as YamlStdoutSink } from "./sink.ts";
import { makeOriginLabels } from "./util.ts";

interface PackageMapping {
  /**
   * A regular expression that captures two groups for the name and version of a Gin-style package.
   * Example: `^([a-z0-9-]+).gin.jsr.io/([a-z0-9-]+)$`
   */
  apiVersionRegex: RegExp;

  /**
   * A template string to generate the actual package name from the captured groups.
   * Example: `@gin/{name}-{version}`
   */
  packageFormat: string;
}

/**
 * The Gin class serves as the main entrypoint for the Kubernetes manifest rendering pipeline.
 *
 * Most of all, it handles the delegation of Gin custom resource definitions to the appropriate resource converter.
 * By default, API versions with the format `<name>.gin.jsr.io/<version>` are mapped to `@gin/<name>-<version>`.
 * Additional mappings can be registered using the `withPackageMapping()`.
 */
export class Gin {
  // Internal module that is used to with `withResourceAdapter()`.
  private module: Module = new Module("<builtin>");

  // A list of modules that have been loaded.
  private modules: Module[] = [];

  // A mapping of regular expressions that capture two groups for the name and version of a Gin-style package
  // as well as a template string to generate the actual package name. The default package mapping is
  // `{name}.gin.jsr.io/{version}` to `@gin/{name}-{version}`.
  private packageMappings: PackageMapping[] = [];

  // Pending package import promises.
  private pendingPackages: Promise<void>[] = [];

  // Pending emits, collect at the end of `run()`.
  private pendingEmits: Promise<void>[] = [];

  // Sink for emitted resources.
  private sink: Sink = new YamlStdoutSink();

  // Warnings collected while processing resources.
  private warnings: string[] = [];

  constructor() {
    this.withModule(this.module);
    this.withPackageMapping("{name}.gin.jsr.io/{version}", "@gin/{name}-{version}");
  }

  /**
   * Add a package mapping to the Gin instance. This allows it to resolve API versions of the specified format to
   * corresponding Gin packages which means you are not limited to the default mapping to packages in the `@gin/`
   * scope.
   *
   * @param apiVersionFormat - A string that defines the format of the API version, which should contain the two
   *    placeholders `{name}` and `{version}`.
   * @param packageFormat - A string that defines the format of the package name, which should also contain the two
   *   placeholders `{name}` and `{version}`.
   * @return The Gin instance itself, allowing for method chaining.
   */
  withPackageMapping(apiVersionFormat: string, packageFormat: string): Gin {
    const regex = escape(apiVersionFormat)
      .replace(escape("{name}"), "([a-z0-9-]+)")
      .replace(escape("{version}"), "([a-z0-9-]+)");
    console.trace(`Adding package mapping: '${apiVersionFormat}' -> '${packageFormat}'`);
    this.packageMappings.push({ apiVersionRegex: new RegExp(regex), packageFormat });
    return this;
  }

  /**
   * Add a specific package to the Gin instance. The package must export a {@link Module}. Note that because the
   * dynamic import mechanism is asynchronous, this method returns immediately and completes in the background.
   * The promise can be awaited with the {@link Gin#ready} method and will also be always awaited in {@link Gin#emit}.
   *
   * @param packageName - The name of the package to add. The package will be imported.
   * @return The Gin instance itself, allowing for method chaining.
   */
  withPackage(packageName: string, optional: boolean = false): Gin {
    const promise = import(packageName).then((pkg) => {
      if (!(pkg.default instanceof Module)) {
        throw new Error(`Package '${packageName}' does not default-export a Module.`);
      }
      console.trace(`Adding package: '${packageName}'`);
      this.modules.push(pkg.default);
    })
      .catch((error) => {
        if (optional) {
          this.warnings.push(`Attempted to load package '${packageName}', but it failed: ${error.message}`);
        } else {
          throw error;
        }
      });
    this.pendingPackages.push(promise);
    return this;
  }

  /**
   * Add an already loaded {@link Module} to the Gin instance.
   */
  withModule(module: Module): Gin {
    console.trace(`Adding module: '${module}'`);
    this.modules.push(module);
    return this;
  }

  /**
   * Add a single {@link ResourceAdapter} to the Gin instance.
   */
  withResourceAdapter<T extends KubernetesObject>(
    apiVersion: Pick<T, "apiVersion" | "kind">,
    adapter: ResourceAdapter<T>,
  ): Gin {
    console.trace(`Adding resource adapter for API version '${apiVersion.apiVersion}' and kind '${apiVersion.kind}'`);
    this.module.withAdapter<T>(apiVersion, adapter);
    return this;
  }

  /**
   * Resolves an API version to a package name, given the registered package mappings.
   */
  resolvePackageNameFromApiVersion(apiVersion: string): string | undefined {
    for (const mapping of this.packageMappings) {
      const match = apiVersion.match(mapping.apiVersionRegex);
      if (match) {
        const [_, name, version] = match;
        return mapping.packageFormat.replace("{name}", name!).replace("{version}", version!);
      }
    }
    return undefined;
  }

  /**
   * Returns a promise that resolves when all packages have been loaded.
   */
  async ready(): Promise<void> {
    if (this.pendingPackages) {
      await Promise.all(this.pendingPackages);
      this.pendingPackages = [];
    }
  }

  /**
   * Finds a {@link ResourceAdapter} in the Gin instance that can handle the specified resource.
   *
   * @param resource - The Kubernetes resource to find an adapter for.
   * @param autoLoad - If `true`, the method will attempt to load a matching package if no adapter is found.
   * @return The {@link ResourceAdapter} that can handle the resource, or `undefined` if no adapter is found.
   */
  async findAdapter<T extends KubernetesObject>(
    resource: T,
    autoLoad: boolean = true,
  ): Promise<ResourceAdapter<T> | undefined> {
    await this.ready();
    const module = this.modules.find((m) => m.hasAdapter(resource));
    if (!module && autoLoad) {
      const packageName = this.resolvePackageNameFromApiVersion(resource.apiVersion);
      if (!packageName) {
        return undefined; // No package mapping found for the API version
      }

      // Attempt to load the package dynamically
      this.withPackage(packageName, true); // Load the package as optional
      return this.findAdapter(resource, false); // Retry finding the adapter after loading the package
    }

    if (module) {
      return module.getAdapter(resource);
    }
  }

  /**
   * Process a Kubernetes resource once.
   *
   * @param resource - The Kubernetes resource to process.
   * @return A promise that resolves to an array of Kubernetes objects that were generated from the resource. If
   *    no adapter is found, the original resource is returned as a single-element array.
   */
  async processOnce<T extends KubernetesObject>(resource: T): Promise<KubernetesObject[]> {
    const adapter = await this.findAdapter(resource);
    if (!adapter) {
      const packageName = this.resolvePackageNameFromApiVersion(resource.apiVersion);
      if (packageName) {
        this.warnings.push(
          `No adapter found for resource of kind '${resource.kind}' with API version ` +
            `'${resource.apiVersion}, despite mapping to package '${packageName}'.`,
        );
      }
      return [resource]; // No adapter found, return the resource as is
    }
    await adapter.validate(this, resource);
    return (await adapter.generate(this, resource)).map((res) => {
      res.metadata = res.metadata || {};
      res.metadata.labels = res.metadata.labels || {};
      res.metadata.labels = { ...res.metadata.labels, ...makeOriginLabels(resource) };
      return res;
    });
  }

  /**
   * Emits a Kubernetes resource, processing it through the Gin pipeline and sending it to the configured sink.
   *
   * @param resource - The Kubernetes resource to emit.
   */
  async emit<T extends KubernetesObject>(resource: T): Promise<void> {
    // We store the promise in `pendingEmits` to ensure that all emits are awaited at the end of the pipeline.
    // This is so we don't require the user to await the emit themselves.
    const promise = (async () => {
      console.trace(`Emitting resource of kind '${resource.kind}' with API version '${resource.apiVersion}'`);
      const resources = await this.processOnce(resource);
      for (const res of resources) {
        await this.sink.accept(res);
      }
    })();
    this.pendingEmits.push(promise);
    return await promise;
  }

  /**
   * Runs the Gin pipeline, executing the provided callback function with the Gin instance. This method is the main
   * entrypoint for running a Gin pipeline and is preferred over performing the same operations manually as it
   * ensures warnings are printed after the pipeline execution and the sink is closed properly.
   */
  async run(
    callback: (gin: Gin) => void | Promise<void>,
  ): Promise<void> {
    this.warnings = []; // Reset warnings before running the pipeline
    try {
      await callback(this);
    } catch (error) {
      console.error("Error during Gin pipeline execution:", error);
      throw error;
    } finally {
      this.sink.close();

      // Print warnings if any were collected
      if (this.warnings.length > 0) {
        console.warn("Warnings during Gin pipeline execution:");
        for (const warning of this.warnings) {
          console.warn(`- ${warning}`);
        }
      }
    }
  }
}

/**
 * This file provides the main entrypoint for a Gin pipeline to render Kubernetes manifests.
 */

import { Module, type ModuleOptions, type ResourceAdapter } from "./module.ts";
import { escape } from "@std/regexp/escape";
import { type Sink, StdoutSink as YamlStdoutSink } from "./sink.ts";
import { type KubernetesObject, ResourceLocator } from "./types.ts";
import { getCallerFileAndLine } from "./util.ts";
import { parseArgs } from "@std/cli";
import _ from "lodash";

interface PackageMapping {
  /**
   * A regular expression that captures two groups for the name and version of a Gin-style package.
   * Example: `^([a-z0-9-]+).gin.jsr.io/([a-z0-9-]+)$`
   */
  apiVersionRegex: RegExp;

  /**
   * A template string to generate the actual package name from the captured groups.
   * Example: `jsr:@gin/{name}-{version}`
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

  // A mapping of package names to their corresponding options.
  private options: Map<string, ModuleOptions> = new Map();

  // A mapping of regular expressions that capture two groups for the name and version of a Gin-style package
  // as well as a template string to generate the actual package name. The default package mapping is
  // `{name}.gin.jsr.io/{version}` to `jsr:@gin/{name}-{version}`.
  private packageMappings: PackageMapping[] = [];

  // Pending package import promises.
  private pendingPackages: Promise<void>[] = [];

  // Pending emits, collect at the end of `run()`.
  private pendingEmits: Promise<void>[] = [];

  // Resources that we've emitted so far. Used to catch when the same unique resource identifier is emitted multiple
  // times.
  private emittedResources: Map<string, ResourceLocator> = new Map();

  // Sink for emitted resources.
  private sink: Sink = new YamlStdoutSink();

  // Warnings collected while processing resources.
  private warnings: string[] = [];

  constructor(mode: "default" | "bare" = "default") {
    if (mode == "default") {
      this.withModule(this.module);
      this.withPackageMapping("{name}.gin.jsr.io/{version}", "jsr:@gin/{name}-{version}");
    }
  }

  /**
   * Add a package mapping to the Gin instance. This allows it to resolve API versions of the specified format to
   * corresponding Gin packages which means you are not limited to the default mapping to packages in the `@gin/`
   * scope.
   *
   * Note that some modules may have required options that need to be configured. For this, you want to use the
   * `withOptions()` method of the Gin instance.
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
      let module: Module | undefined = undefined;

      // If a function is exported, it is one that produces a module given options.
      if (typeof pkg.default === "function") {
        const options = this.options.get(pkg.default.name);
        module = pkg.default(options);
        if (!(module instanceof Module)) {
          throw new Error(`Package '${packageName}' default export is a function, but it did not return a Module.`);
        }
      } else if (pkg.default instanceof Module) {
        module = pkg.default;
      } else {
        throw new Error(`Package '${packageName}' does not default-export a Module or function.`);
      }

      console.trace(`Adding package: '${packageName}'`);
      this.modules.push(module!);
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
   * Setup options for when a module is loaded from a package.
   */
  withOptions<T extends ModuleOptions>(options: Pick<T, "type"> & Partial<T>): Gin {
    if (!options.type) {
      throw new Error("Module options must have a 'type' field.");
    }
    console.trace(`Adding options for module type '${options.type}':`, options);
    this.options.set(options.type, options as T);
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
    resource.gin = resource.gin || {};

    // Find a matching adapter for the resource.
    const adapter = await this.findAdapter(resource);
    if (!adapter) {
      // If no adapter is found, we check if the API version maps to a package. In that case, we just want to
      // let the user know that they could be missing it.
      const packageName = this.resolvePackageNameFromApiVersion(resource.apiVersion);
      if (packageName) {
        // TODO: Instead of issueing a global warning, get it from the warnings on the emitted resources?
        const message = `No adapter found for resource of kind '${resource.kind}' with API version ` +
          `'${resource.apiVersion}, despite mapping to package '${packageName}'.`;
        this.warnings.push(message);
        resource.gin = resource.gin || {};
        resource.gin.notes = resource.gin.notes || [];
        resource.gin.notes.push({ kind: "Warning", message });
      }

      return [resource]; // No adapter found, return the resource as is
    }

    resource.gin.children = [];
    await adapter.validate(this, resource);
    return (await adapter.generate(this, resource)).map((res) => {
      // If the adapter returns its own resource object, we don't update the parent field.
      if (res === resource) {
        return resource;
      }

      res.gin = res.gin || {};
      res.gin.parent = ResourceLocator.of(resource);
      resource.gin?.children?.push(ResourceLocator.of(res));
      return res;
    });
  }

  /**
   * Emits a Kubernetes resource, processing it through the Gin pipeline and sending it to the configured sink.
   * Note that the resource as well as its generated children (if any) are all emitted to the sink. The sink is
   * responsible for filtering out resources that should not be emitted, such as those that have the `parent` field
   * in {@link KubernetesObject#gin} set.
   *
   * Note that this method creates a deep clone of the `resource` object, so it can be safely modified in-place later
   * (which is happening in {@link Gin#processOnce}).
   *
   * @param resource - The Kubernetes resource to emit.
   */
  async emit<T extends KubernetesObject>(resource: T): Promise<void> {
    resource = _.cloneDeep(resource);
    resource.gin = resource.gin || {};
    resource.gin.emittedFrom = getCallerFileAndLine();

    // Check if we emitted this resource before. If we did, we issue a warning.
    // TODO: Produce structured warnings, so we can include the resource's Gin metadata.
    const locator = ResourceLocator.of(resource);
    if (this.emittedResources.has(locator.toString())) {
      this.warnings.push(
        `Resource of kind '${resource.kind}' with API version '${resource.apiVersion}' and name ` +
          `'${resource.metadata.name}' has already been emitted before. The resource appears more than once in the output.`,
      );
    }
    this.emittedResources.set(locator.toString(), locator);

    const promise = (async () => {
      console.trace(`Emitting resource of kind '${resource.kind}' with API version '${resource.apiVersion}'`);

      const children = await this.processOnce(resource);

      // Only send the resource to the sink after it has been processed. The `processOnce` method modifies the
      // resource in place (e.g. by ensuring the `gin` field is updated appropriately).
      this.sink.accept(resource);

      // If the object is not processed by a the adapter, we will get a list with a single resource in it.
      if (children.length === 1 && children[0] === resource) {
        return; // No processing was done, we just emit the original resource
      }

      // If we have a single resource, and it has the same locator as the original resource, but it's not the same,
      // then something is wrong in the resource adapter. Since we know the behaviour of `processOnce` is to return
      // the same object, it must have come from an adapter.
      if (children.length === 1 && locator.equals(ResourceLocator.of(children[0]!))) {
        throw new Error(
          `Resource adapter for '${resource.kind}' with API version '${resource.apiVersion}' ` +
            `returned a single resource that is the same as the original resource, but it is not the same object. ` +
            `This is likely a bug in the resource adapter.`,
        );
      }

      // Recursively emit the new resources.
      for (const res of children) {
        res.gin = res.gin || {};
        res.gin.loadedFromRoot = resource.gin?.loadedFromRoot || resource.gin?.loadedFrom;
        res.gin.emittedFromRoot = resource.gin?.emittedFromRoot || resource.gin?.emittedFrom;
        await this.emit(res);
      }
    })();

    // We store the promise in `pendingEmits` to ensure that all emits are awaited at the end of the pipeline.
    // This is so we don't require the user to await the emit themselves.
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
    const args = parseRunArgs();
    this.sink = new YamlStdoutSink(args);

    this.warnings = [];
    this.pendingEmits = [];

    try {
      await callback(this);
    } catch (error) {
      console.error("Error during Gin pipeline execution:", error);
      throw error;
    } finally {
      this.sink.close();

      // Wait for all pending emits to complete
      await Promise.all(this.pendingEmits);

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

/**
 * Command-line arguments usable with {@link Gin#run}.
 */
interface RunArgs {
  /**
   * Whether to keep the `gin` metadata field in emitted resources.
   */
  keepGinMetadata: boolean;

  /**
   * Whether to emit resources that have been processed by a {@link ResourceAdapter}.
   */
  emitParents: boolean;
}

function parseRunArgs(): RunArgs {
  const args = parseArgs(Deno.args);
  return {
    keepGinMetadata: args["keep-gin-metadata"] || args["m"] ? true : false,
    emitParents: args["emit-parents"] || args["p"] ? true : false,
  };
}

/**
 * This file provides the main entrypoint for a Gin pipeline to render Kubernetes manifests.
 */

import { Module, type ModuleOptions, type ResourceAdapter } from "./module.ts";
import { escape } from "@std/regexp/escape";
import { CaptureSink, type Sink, StdoutSink } from "./sink.ts";
import { type KubernetesObject, ResourceLocator } from "./types.ts";
import { deepClone, dropUndefined, getCallerFileAndLine, replaceValues } from "./utils.ts";
import { parseArgs } from "@std/cli";
import { SecretValue } from "./mod.ts";

/**
 * This annotation field is used to store the {@link KubernetesObject#gin} metadata for a resource.
 */
export const GIN_METADATA_ANNOTATION = "gin.jsr.io/metadata";

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
  private sink: Sink = new StdoutSink();

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
  withPackage(packageName: string): Gin {
    const promise = import(packageName).then(async (pkg) => {
      let module: Module | undefined = undefined;

      // If a function is exported, it is one that produces a module given options.
      if (typeof pkg.default === "function") {
        const options = this.getOptions(packageName);
        module = await pkg.default(options);
        if (!(Module.isModule(module))) {
          console.trace(
            `Package '${packageName}' default export is a function, but it did not return a Module. Got instead:`,
            module,
          );
          throw new Error(`Package '${packageName}' default export is a function, but it did not return a Module.`);
        }
      }
      else if (Module.isModule(pkg.default)) {
        module = pkg.default;
      }
      else {
        throw new Error(`Package '${packageName}' does not default-export a Module or function.`);
      }

      console.trace(`Adding package: '${packageName}'`);
      this.modules.push(module!);
    });
    this.pendingPackages.push(promise);
    return this;
  }

  /**
   * Setup options for when a module is loaded from a package.
   */
  withOptions<T extends ModuleOptions>(options: Pick<T, "pkg"> & Partial<T>): Gin {
    if (!options.pkg) {
      throw new Error("Module options must have a 'type' field.");
    }
    console.trace(`Adding options for module type '${options.pkg}':`, options);
    this.options.set(options.pkg, options as T);
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
   * Override the sink where the final resources are emitted to.
   */
  withSink(sink: Sink): Gin {
    console.trace(`Using sink`, sink);
    this.sink = sink;
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
   * Load the options for the given module.
   *
   * @param pkg - The package name of the module to load options for. This may have the `jsr:` prefix, which is
   *              stripped first (see {@link ModuleOptions#pkg}).
   */
  getOptions(pkg: string): ModuleOptions | undefined {
    if (pkg.startsWith("jsr:")) {
      pkg = pkg.slice(4);
    }
    return this.options.get(pkg);
  }

  /**
   * Returns a promise that resolves when all packages have been loaded.
   */
  get ready(): Promise<void> {
    return (async () => {
      if (this.pendingPackages) {
        await Promise.all(this.pendingPackages);
        this.pendingPackages = [];
      }
    })();
  }

  /**
   * Returns a promise that resolves when all resources have been emitted.
   */
  get done(): Promise<void> {
    return (async () => {
      // Ensure all pending emits are completed.
      await Promise.all(this.pendingEmits);
      this.pendingEmits = [];
    })();
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
    await this.ready;
    const module = this.modules.find((m) => m.hasAdapter(resource));
    if (!module && autoLoad) {
      const packageName = this.resolvePackageNameFromApiVersion(resource.apiVersion);
      if (!packageName) {
        return undefined; // No package mapping found for the API version
      }

      // Attempt to load the package dynamically
      this.withPackage(packageName);
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
  emit<T extends KubernetesObject>(resource: T, options?: { emitterStackDepth?: number }): Promise<void> {
    resource = deepClone(resource);
    resource.gin = resource.gin || {};
    resource.gin.emittedFrom = getCallerFileAndLine((options?.emitterStackDepth || 0) + 2);

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

      // The final processing step is to replace any `SecretValue` instances with their string representation,
      // and drop any `undefined` values as they cannot be stringified to YAML.
      const finalResource = dropUndefined(replaceValues(resource, (val) => {
        if (SecretValue.isSecretValue(val)) {
          return val.secretValue;
        }
        return val;
      }));

      // When we're running in ArgoCD, the full filename that a resource is emitted from will always change due
      // to the temporary directory that the worktree is checked out to for the config management plugin. To
      // work around this, we update these filenames in the Gin metadata.
      const ARGOCD_TMP_DIR = "file:///tmp/_cmp_server/";
      finalResource.gin = finalResource.gin || {};
      for (const key of ["loadedFrom", "emittedFrom", "loadedFromRoot", "emittedFromRoot"]) {
        let value = (finalResource.gin as Record<string, string | undefined>)[key];
        if (value !== undefined && typeof value === "string" && value.startsWith(ARGOCD_TMP_DIR)) {
          // Remove the ArgoCD temporary directory prefix from the value, and then the subdirectory as it
          // is the random part.
          value = value.slice(ARGOCD_TMP_DIR.length);
          value = "file://" + value.split("/").slice(1).join("/");
          (finalResource.gin as Record<string, string | undefined>)[key] = value;
        }
      }

      finalResource.metadata.annotations = finalResource.metadata.annotations || {};
      finalResource.metadata.annotations[GIN_METADATA_ANNOTATION] = JSON.stringify(finalResource.gin || {});

      // Only send the resource to the sink after it has been processed. The `processOnce` method modifies the
      // resource in place (e.g. by ensuring the `gin` field is updated appropriately).
      this.sink.accept(finalResource);

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
    return promise;
  }

  /**
   * Emits multiple Kubernetes resources at once.
   */
  emitMany<T extends KubernetesObject>(
    resources: T[] | AsyncIterable<T> | Iterable<T>,
    options?: { emitterStackDepth?: number },
  ): Promise<void> {
    const promise = (async () => {
      for await (const resource of resources) {
        await this.emit(resource, { ...options, emitterStackDepth: (options?.emitterStackDepth || 0) + 1 });
      }
    })();
    this.pendingEmits.push(promise);
    return promise;
  }

  /**
   * Print the warnings collected during the pipeline execution to the console.
   */
  printWarnings(): Promise<void> {
    if (this.warnings.length > 0) {
      console.warn("Warnings during Gin pipeline execution:");
      for (const warning of this.warnings) {
        console.warn(`- ${warning}`);
      }
    }
    return Promise.resolve();
  }

  /**
   * This is a convenience entrypoint for running a Gin pipeline which parses command-line arguments (see
   * {@link RunArgs}) and sets up a {@link StdoutSink} accordingly. The `callback` function is executed with the
   * Gin instance as its argument, allowing it to use it to emit Kubernetes resources which are processed and
   * forwarded to the sink.
   *
   * When the callback function completes, the sink is closed and any warnings collected during the pipeline
   * execution are printed to the console.
   *
   * This is a shorthand of using {@link withSink}, awaiting {@link done} and {@link printWarnings} manually.
   */
  async run(
    callback: (gin: Gin) => void | Promise<void>,
  ): Promise<void> {
    const args = parseRunArgs();
    this.sink = new StdoutSink(args);
    this.warnings = [];
    this.pendingEmits = [];

    try {
      await callback(this);
    }
    catch (error) {
      console.error("Error during Gin pipeline execution:", error);
      throw error;
    }
    finally {
      this.sink.close();
      await this.done;
      await this.printWarnings();
    }
  }

  /**
   * A helper function that is mostly useful for writing tests. Creates a new Gin instance with a {@link CaptureSink}
   * and emits the given resources to it. The captured resources are returned as an array.
   */
  static async staticCaptureEmitMany<T extends KubernetesObject>(
    resources: T[] | AsyncIterable<T> | Iterable<T>,
    options?: { emitterStackDepth?: number; keepGinMetadataAnnotation?: boolean; keepGinMetadata?: boolean },
  ): Promise<T[]> {
    const gin = new Gin().withSink(new CaptureSink());
    await gin.emitMany(resources, { ...options, emitterStackDepth: (options?.emitterStackDepth || 0) + 1 });
    const docs = (gin.sink as CaptureSink).captured as T[];
    if (!(options?.keepGinMetadataAnnotation ?? false)) {
      // Remove the `gin` metadata annotation from the resources.
      for (const doc of docs) {
        if (doc.metadata.annotations) {
          delete doc.metadata.annotations[GIN_METADATA_ANNOTATION];
        }
      }
    }
    if (!(options?.keepGinMetadata ?? false)) {
      // Remove the `gin` metadata field from the resources.
      for (const doc of docs) {
        if (doc.gin) {
          delete doc.gin;
        }
      }
    }
    return docs;
  }
}

/**
 * Command-line arguments usable with {@link Gin#run}.
 */
interface RunArgs {
  /**
   * `-m`, `--keep-gin-metadata`
   *
   * Whether to keep the `gin` metadata field in emitted resources.
   */
  keepGinMetadata: boolean;

  /**
   * `-p`, `--emit-parents`
   *
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

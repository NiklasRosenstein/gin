import type { KubernetesObject } from "./types.ts";
import type { Gin } from "./gin.ts";

/**
 * Some modules may require options to be created. If a Gin package exports a function instead of a {@link Module},
 * the function is expected to accept an options object with the `type` field matching what it expects and return a
 * {@link Module} instance.
 *
 * The {@link pkg} field must be the name of your JSR package with the `jsr:` prefix, just like the
 * {@link Module#name}, only that here it is mandatory for Gin to resolve the options when the module is loaded by
 * {@link Gin#withPackage}. This is because the options must be resolved before the module is loaded, and that is
 * based on the package name. The {@link Module#name} should only be the same value for consistency.
 */
export interface ModuleOptions {
  pkg: string;
  [key: string]: unknown;
}

/**
 * A module is what can be exported by a TypeScript package to extend Gin.
 *
 * Currently it can only be used to register {@link ResourceAdapter}s for a specific API version and kind.
 *
 * Modules are usually loaded by a {@link Gin} instance when recognizing a familar API version, such as any of the
 * form `{name}.gin.jsr.io/{version}` which is mapped to and used to import from a package `jsr:@gin/{name}-{version}`.
 * Such packages are expected to export a `Module` instance that supplies a {@link ResourceAdapter} that can handle
 * the encountered API version and kind.
 */
export class Module {
  private pkg: string;
  private resourceAdapters: Map<string, Map<string, ResourceAdapter>> = new Map();

  /**
   * @param pkg - The name of the package that exports this module, without the `jsr:` prefix. This should be set
   *              properly only for consistency; it is only actually required to be the correct package name on
   *              {@link ModuleOptions#pkg}.
   */
  constructor(pkg: string) {
    this.pkg = pkg;
  }

  toString(): string {
    return `Module(from pkg: ${this.pkg})`;
  }

  /**
   * Checks if the module has a {@link ResourceAdapter} for the specified `apiVersion` and `kind`.
   */
  hasAdapter<T extends KubernetesObject>(tag: Pick<T, "apiVersion" | "kind">): boolean {
    const { apiVersion, kind } = tag;
    return this.resourceAdapters.has(apiVersion) && this.resourceAdapters.get(apiVersion)!.has(kind);
  }

  /**
   * Get the {@link ResourceAdapter} for the specified `apiVersion` and `kind`.
   */
  getAdapter<T extends KubernetesObject>(tag: Pick<T, "apiVersion" | "kind">): ResourceAdapter<T> {
    const { apiVersion, kind } = tag;
    if (!this.resourceAdapters.has(apiVersion)) {
      throw new Error(`No resource adapter registered for apiVersion '${apiVersion}'`);
    }
    const adapters = this.resourceAdapters.get(apiVersion)!;
    if (!adapters.has(kind)) {
      throw new Error(`No resource adapter registered for kind '${kind}' in apiVersion '${apiVersion}'`);
    }
    return adapters.get(kind) as ResourceAdapter<T>;
  }

  /**
   * Register a {@link ResourceAdapter} for a specific Kubernetes resource type, allowing a {@link Gin} instance
   * that uses this module to adapt resources of this type to actual Kubernetes resources.
   *
   * @param tag - An object specifying the `apiVersion` and `kind` of the resource.
   * @param adapter - The {@link ResourceAdapter} that will handle the conversion and validation of the resource.
   * @returns The module itself, allowing for method chaining.
   */
  withAdapter<T extends KubernetesObject>(tag: Pick<T, "apiVersion" | "kind">, adapter: ResourceAdapter<T>): Module {
    const { apiVersion, kind } = tag;
    if (!this.resourceAdapters.has(apiVersion)) {
      this.resourceAdapters.set(apiVersion, new Map());
    }
    this.resourceAdapters.get(apiVersion)!.set(kind, adapter);
    return this;
  }
}

/**
 * A ResourceAdapter is a component that materializes a Kubernetes-style resource into one or more other Kubernetes
 * resources. This is used to create abstractions that are expanded to real Kubernetes resources at rendering time.
 *
 * When a {@link Gin} instance encounters a resource of an `apiVersion` and `kind` that matches a known
 * {@link ResourceAdapter} registered in a {@link Module}, it will use that adapter to validate the resource and
 * generate the actual Kubernetes resources that should be created in the cluster. Note that an adapter can return
 * resources that need to be further processed by other adapters, allowing for complex resource graphs to be built
 * from simple abstractions.
 *
 * When you are looking to uniquely associate a resource with the Gin custom resource that was used to generate it,
 * you should use the canonical resource name as if it was a Kubernetes CRD. For example, for the `WebApp` resource
 * in `webapp.gin.jsr.io/v1alpha1`, the canonical name would be `webapp.gin.jsr.io/v1alpha1.WebApp`.
 */
export interface ResourceAdapter<T extends KubernetesObject = KubernetesObject> {
  /**
   * Validate the resource.
   *
   * At the very least, if the resource is scoped or cluster-wide, the adapter should check that the
   * `metadata.namespace` is set correctly.
   *
   * @param gin - The Gin instance that is validating the resource.
   * @param resource - The Kubernetes-style resource to validate.
   * @returns A promise that resolves if the template is valid, or rejects with an error if it is not.
   */
  validate(gin: Gin, resource: T): Promise<void>;

  /**
   * Generate Kubernetes resources from the provided resource.
   *
   * @param gin - The Gin instance that is generating the resources.
   * @param resource - The Kubernetes-style resource to convert.
   * @return A promise that resolves to an array of Kubernetes objects generated from the resource.
   */
  generate(gin: Gin, resource: T): Promise<KubernetesObject[]>;
}

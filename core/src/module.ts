import type { KubernetesObject } from "./types.ts";
import type { Gin } from "./gin.ts";

/**
 * A module is what can be exported by a TypeScript package to extend Gin.
 *
 * Currently it can only be used to register {@link ResourceAdapter}s for a specific API version and kind.
 *
 * Modules are usually loaded by a {@link Gin} instance when recognizing a familar API version, such as any of the
 * form `{name}.gin.jsr.io/{version}` which is mapped to and used to import from a package `@gin/{name}-{version}`.
 * Such packages are expected to export a `Module` instance that supplies a {@link ResourceAdapter} that can handle
 * the encountered API version and kind.
 */
export class Module {
  private name: string;
  private resourceAdapters: Map<string, Map<string, ResourceAdapter>> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  toString(): string {
    return `Module(name: ${this.name})`;
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
 */
export interface ResourceAdapter<T extends KubernetesObject = KubernetesObject> {
  /**
   * Validate the resource.
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

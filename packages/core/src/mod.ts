export { Gin } from "./gin.ts";
export { Module, type ModuleOptions, type ResourceAdapter } from "./module.ts";
export * from "./types.ts";
export { type SecretProvider, SecretValue } from "./secret.ts";
export { getGinCacheDir } from "./utils.ts";
export { CaptureSink, type Sink, StdoutSink } from "./sink.ts";

/**
 * This is an identity function. It's single purpose is to make sure the compiler will check for extra fields
 * and fields of the wrong type in the object passed to it. This is useful when constructing a larger object in
 * a literal form, such as a Kubernetes manifest, but you want parts of the object to be checked as a specific type.
 *
 * @param obj The object to check.
 * @return The same object, for chaining.
 *
 * @example
 * ```ts
 * import { _ } from "@gin/core";
 *
 * interface Foo {
 *   bar: string;
 * }
 *
 * const obj = {
 *   foo: _<Foo>({
 *     bar: "baz"
 *   })
 * }
 * ```
 */
export function _<T>(obj: T): T {
  return obj;
}

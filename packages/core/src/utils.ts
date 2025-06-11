import type { DigestAlgorithm } from "@std/crypto/crypto";
import { encodeHex } from "@std/encoding/hex";
import StackTracey from "stacktracey";

/**
 * Validates that a string is fit as a value for a Kubernetes label.
 *
 * See https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
 */
export function isValidKubernetesLabelValue(value: string): boolean {
  if (value.length > 63) {
    return false; // Kubernetes label values must be 63 characters or less
  }
  return /^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$/.test(value);
}

/**
 * Returns the filename and line number of the caller of this function.
 */
export function getCallerFileAndLine(depth: number = 1): string {
  const trace = new StackTracey(new Error());
  const file = trace.items[depth + 1]?.file || "<unknown>";
  const line = trace.items[depth + 1]?.line || "??";
  return `${file}:${line}`;
}

/**
 * Recursively drop keys from the object that have value `undefined`.
 */
export function dropUndefined<T>(arr: (T | undefined)[]): T[];
export function dropUndefined<T>(obj: T): T;
export function dropUndefined<T extends unknown>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.filter((x) => x !== undefined).map(dropUndefined) as T;
  }
  else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, dropUndefined(v)]),
    ) as T;
  }
  return obj;
}

/**
 * Create a temporary directory that will be cleaned up when the Deno process exits. Note that
 * this directory may be left behind if the process is killed or crashes.
 */
export async function createManagedTempDir(prefix: string): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix });
  globalThis.addEventListener("unload", () => {
    try {
      // NOTE: If we use the async variant, not all file will be removed before the process exits.
      Deno.removeSync(dir, { recursive: true });
    }
    catch (e) {
      console.warn(`Failed to remove temporary directory ${dir}:`, e);
    }
  });
  return dir;
}

/**
 * Restores the prototypes of objects in a structured clone.
 */
// deno-lint-ignore no-explicit-any
export function restorePrototypes<T>(original: T, clone: any): T {
  if (original && typeof original === "object") {
    Object.setPrototypeOf(clone, Object.getPrototypeOf(original));
    for (const key of Object.keys(clone)) {
      if (typeof clone[key] === "object" && clone[key] !== null && (original as Record<string, unknown>)[key]) {
        restorePrototypes((original as Record<string, unknown>)[key], clone[key]);
      }
    }
  }
  return clone;
}

/**
 * Performs a deep clone of an object, retaining object prototypes.
 */
export function deepClone<T>(obj: T): T {
  const clone = structuredClone(obj);
  return restorePrototypes(obj, clone);
}

/**
 * Replace values in an object or array recursively based on a mapping function. Returns a copy of the
 * original object or array with the values replaced.
 */
export function replaceValues<T>(
  obj: T,
  mappingFn: (value: unknown) => unknown,
  order: "pre" | "post" = "pre",
): T {
  if (order == "pre") {
    obj = mappingFn(obj) as T;
  }

  if (Array.isArray(obj)) {
    obj = obj.map((item) => replaceValues(item, mappingFn)) as unknown as T;
  }
  else if (obj && typeof obj === "object") {
    const newObj = {} as Record<string, unknown>;
    Object.setPrototypeOf(newObj, Object.getPrototypeOf(obj));
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = replaceValues(value, mappingFn);
    }
    obj = newObj as T;
  }

  if (order == "post") {
    obj = mappingFn(obj) as T;
  }

  return obj;
}

/**
 * Hashes the given data using the specified algorithm and returns the hash as a hexadecimal string.
 *
 * @param algorithm - The hashing algorithm to use (e.g., "SHA-1", "SHA-256").
 * @param data - An array of strings to be concatenated and hashed.
 */
export async function hashToHexdigest(
  algorithm: DigestAlgorithm,
  data: string[],
): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    algorithm,
    encoder.encode(data.join("\n")),
  );
  return encodeHex(hashBuffer);
}

/**
 * Returns the cache path for Gin pipelines. If `GIN_CACHE_DIR` is set, and the Deno runtime has read access to it,
 * it will return that path. Otherwise, it will return the default cache directory (`.gin/cache`). It will also
 * log a warning if the `GIN_CACHE_DIR` variable cannot be read.
 */
export async function getGinCacheDir(): Promise<string> {
  const hasPermission = await Deno.permissions.query({ name: "env", variable: "GIN_CACHE_DIR" }).then((p) => p.state);
  if (hasPermission !== "granted") {
    console.warn("GIN_CACHE_DIR environment variable is not accessible. Defaulting to `.gin/cache`.");
    return ".gin/cache";
  }
  return Deno.env.get("GIN_CACHE_DIR") ?? ".gin/cache";
}

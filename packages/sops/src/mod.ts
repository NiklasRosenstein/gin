import { type SecretProvider, SecretValue } from "@gin/core";
import { assert } from "@std/assert";
import { JSONPath } from "jsonpath-plus";

type SopsFileType = "json" | "yaml" | "dotenv" | "binary";

async function loadSops(
  path: string,
  agePrivateKey?: string,
  inputType?: SopsFileType,
): Promise<Record<string, unknown>> {
  const output = await new Deno.Command("sops", {
    args: [
      "--output-type",
      "json",
      "--decrypt",
      ...(inputType ? ["--input-type", inputType] : []),
      path,
    ],
    env: {
      // Ensure that the SOPS_AGE_KEY environment variable is set if an age private key is provided.
      ...(agePrivateKey ? { SOPS_AGE_KEY: agePrivateKey } : {}),
    },
  }).output();

  if (output.code !== 0) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`Failed to decrypt SOPS file at ${path}.\nError: ${stderr}`);
  }

  return JSON.parse(new TextDecoder().decode(output.stdout));
}

/**
 * Implements a secret provider that loads secrets from a SOPS-encrypted file.
 *
 * Supports JSONPath expressions in {@link get}.
 */
export class Sops implements SecretProvider {
  private path: string;
  private agePrivateKey?: SecretValue<string>;
  private dataPromise?: Promise<void>;
  private data?: SecretValue<Record<string, unknown>>;

  /**
   * Creates a new Sops instance.
   *
   * @param path - The path to the SOPS file to load.
   * @param agePrivateKey - Optional. The private key to use for decrypting the SOPS file. This will be passed to
   *                        `sops` CLI via the `SOPS_AGE_KEY` environment variable. Using this field is not usually
   *                        recommended. Setting `SOPS_AGE_KEY` directly is preferred.
   * @param data - Optional. If provided, this will be used as the SOPS data instead of loading it from the file.
   */
  constructor({ path, agePrivateKey, data }: {
    path: string;
    agePrivateKey?: string;
    data?: Record<string, unknown>;
  }) {
    this.path = path;
    this.agePrivateKey = agePrivateKey ? SecretValue.of(agePrivateKey) : undefined;
    if (data === undefined) {
      this.dataPromise = loadSops(this.path, this.agePrivateKey?.secretValue).then(SecretValue.of).then((data) => {
        this.data = data;
        this.dataPromise = undefined;
      });
      this.data = undefined;
    } else {
      this.dataPromise = undefined;
      this.data = SecretValue.of(data);
    }
  }

  private async resolve(name: string): Promise<unknown[]> {
    await this.dataPromise;
    assert(this.data !== undefined, "SOPS data is expected to be available now.");
    // TODO: Error handling?
    return JSONPath({ path: name, json: this.data.secretValue, resultType: "value" });
  }

  async getString(name: string): Promise<SecretValue<string>> {
    const result = await this.resolve(name);
    if (result.length !== 1) {
      throw new Error(
        `Failed to resolve "string" secret "${name}", expected a single value, got ${result.length} values.`,
      );
    }
    if (typeof result[0] !== "string") {
      throw new Error(`Failed to resolve "string" secret "${name}", expected "string" got "${typeof result[0]}".`);
    }
    return SecretValue.of(result[0]);
  }

  async getArray(name: string): Promise<SecretValue<Array<unknown>>> {
    const result = await this.resolve(name);
    if (name.includes("[*]")) {
      return SecretValue.of(result as Array<unknown>);
    } else if (result.length !== 1) {
      throw new Error(
        `Failed to resolve "array" secret "${name}", expected a single value, got ${result.length} values.`,
      );
    }
    if (!Array.isArray(result[0])) {
      throw new Error(`Failed to resolve "array" secret "${name}", expected "array" got "${typeof result[0]}".`);
    }
    return SecretValue.of(result[0] as Array<unknown>);
  }

  async getObject(name: string): Promise<SecretValue<Record<string, unknown>>> {
    const result = await this.resolve(name);
    if (result.length !== 1) {
      throw new Error(
        `Failed to resolve "object" secret "${name}", expected a single value, got ${result.length} values.`,
      );
    }
    if (typeof result[0] !== "object" || result[0] === null || Array.isArray(result[0])) {
      throw new Error(`Failed to resolve "object" secret "${name}", expected "object" got "${typeof result[0]}".`);
    }
    return SecretValue.of(result[0] as Record<string, unknown>);
  }
}

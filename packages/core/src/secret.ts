/**
 * Represents a secret value that should not be logged or printed in any way. This does not have anything to do with
 * Kubernetes secrets, it's just a canonical method in Gin to denote that a value is not to be revealed lightly.
 */

export class SecretValue<T = string> {
  public secretValue: T;

  constructor(value: T) {
    this.secretValue = value;
  }

  toString(): string {
    return "[SecretValue]";
  }

  equals(other: SecretValue<T>): boolean {
    if (!(other instanceof SecretValue)) {
      return false;
    }
    return this.secretValue === other.secretValue;
  }

  /**
   * Prevent the secret value from being logged or printed in any way, even with `console.log()`.
   */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.toString();
  }

  /**
   * Convert the contained secret string into base64. Throws an error if the value is not a string.
   */
  secretAsBase64(): string {
    if (typeof this.secretValue !== "string") {
      throw new Error("SecretValue can only be converted to base64 if it is a string");
    }
    return btoa(this.secretValue);
  }

  /**
   * Map the secret value to another secret value.
   */
  map<U>(fn: (value: T) => U): SecretValue<U> {
    return new SecretValue(fn(this.secretValue));
  }

  /**
   * Check if the provided value is a `SecretValue` instance or an object with a `secretValue` property.
   */
  static isSecretValue<T>(value: unknown): value is SecretValue<T> {
    return value instanceof SecretValue || (value && typeof value === "object" && "secretValue" in value) as boolean;
  }

  static of<T = string>(value: T): SecretValue<T> {
    return new SecretValue(value);
  }
}

/**
 * A secret provider is a function that looks up a secret by name and returns a `SecretValue`. Secrets are
 * usually strings, but a complex object can also be returned (depending on the value at the provided name).
 */
export interface SecretProvider {
  getString(name: string): Promise<SecretValue<string>>;
  getArray(name: string): Promise<SecretValue<Array<unknown>>>;
  getObject(name: string): Promise<SecretValue<Record<string, unknown>>>;
}

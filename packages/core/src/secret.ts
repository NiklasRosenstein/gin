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

  /**
   * Convert the contained secret string into base64. Throws an error if the value is not a string.
   */
  secretAsBase64(): string {
    if (typeof this.secretValue !== "string") {
      throw new Error("SecretValue can only be converted to base64 if it is a string");
    }
    return btoa(this.secretValue);
  }

  static of<T = string>(value: T): SecretValue<T> {
    return new SecretValue(value);
  }
}

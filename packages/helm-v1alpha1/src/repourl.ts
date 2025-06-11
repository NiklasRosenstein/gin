import type { DigestAlgorithm } from "@std/crypto/crypto";
import { hashToHexdigest } from "@gin/core/utils";

/**
 * Represents a URL to a file on the local filesystem.
 *
 * Examples: `file:///absolute/path`, `file://relative/path`.
 */
export class FileUrl {
  readonly type = "file";
  constructor(public path: string) {}
  toString(): string {
    return `file://${this.path}`;
  }
}

/**
 * Represents a URL to a Git repository, ref or rev and a path inside the repository.
 *
 * Examples:
 * - `git+ssh://git@github.com/example/repo.git?ref=branch&path=subdir`
 * - `git+https://github.com/example/repo.git?rev=shasum&path=subdir`
 */
export class GitUrl {
  readonly type = "git";
  constructor(
    public protocol: "ssh" | "http" | "https",
    public repo: string,
    public ref?: string,
    public rev?: string,
    public path?: string,
  ) {}
  toString(): string {
    const proto = `git+${this.protocol}`;
    let url = `${proto}://${this.repo}`;
    const params = [];
    if (this.ref) {
      params.push(`ref=${encodeURIComponent(this.ref)}`);
    }
    if (this.rev) {
      params.push(`rev=${encodeURIComponent(this.rev)}`);
    }
    if (this.path) {
      params.push(`path=${encodeURIComponent(this.path)}`);
    }
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }
    return url;
  }

  getCloneUrl() {
    return `${this.protocol}://${this.repo}`;
  }

  /**
   * Returns a hash key that can be used to represent the repository URL, excluding the `rev`, `ref` and
   * possibly `username` and `password` if present.
   */
  async getRepoHashKey(algorithm: DigestAlgorithm = "SHA-1"): Promise<string> {
    // We use proxy:// as the scheme because (1) the URL constructor requires a URL with a scheme, and (2) we want to
    // ignore the protocol for this hash key, as the protocol should not affect which repo you're getting.
    const url = new URL("proxy://" + this.repo);
    url.username = "";
    url.password = "";

    if (url.pathname.endsWith(".git")) {
      // Remove the trailing .git if present, as it should not change the repository you're getting.
      url.pathname = url.pathname.slice(0, -4);
    }

    // Create a hash of the URL without query parameters.
    return await hashToHexdigest(algorithm, [url.toString(), this.path ?? ""]);
  }

  /**
   * Return the repository path name, which is the part of the URL that identifies the repository on the remote.
   */
  getPathName(): string {
    let name = new URL("proxy://" + this.repo).pathname;
    if (name.startsWith("/")) {
      name = name.slice(1);
    }
    if (name.endsWith(".git")) {
      name = name.slice(0, -4);
    }
    return name;
  }
}

type RepoUrl = string | FileUrl | GitUrl;

export function parseRepoUrl(url: string): RepoUrl {
  if (url.startsWith("file://")) {
    return new FileUrl(url.slice(7)); // Remove "file://"
  }

  const parsed = new URL(url);

  // Regular URLs that Helm can handle.
  if (["oci:", "http:", "https:"].includes(parsed.protocol)) {
    return url; // Return as plain URL
  }

  // Handle git URLs with git+ssh or git+https protocols
  if (parsed.protocol.startsWith("git+")) {
    const protocol = parsed.protocol.slice(4);
    if (["ssh:", "http:", "https:"].includes(protocol)) {
      // Include username and password if present (e.g., user:pass@host)
      let userinfo = parsed.username;
      if (parsed.password) {
        userinfo += `:${parsed.password}`;
      }
      const repo = (userinfo ? `${userinfo}@` : "") + parsed.host + parsed.pathname;
      const searchParams = parsed.searchParams;
      const proto = protocol.replace(":", "");
      return new GitUrl(
        proto as "ssh" | "http" | "https",
        repo,
        searchParams.get("ref") || undefined,
        searchParams.get("rev") || undefined,
        searchParams.get("path") || undefined,
      );
    }
  }

  throw new Error(`Unsupported repository URL: ${url}`);
}

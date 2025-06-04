import { parseRepoUrl } from "./repourl.ts";
import { assertEquals, assertThrows } from "@std/assert";

// Import the classes for type narrowing
import { type FileUrl, GitUrl } from "./repourl.ts";

Deno.test("parseRepoUrl: file URL absolute", () => {
  const url = "file:///absolute/path/to/chart";
  const result = parseRepoUrl(url);
  if (typeof result === "string") {
    throw new Error("Expected FileUrl instance");
  }
  if (result.type !== "file") {
    throw new Error("Expected type 'file'");
  }
  const fileUrl = result as FileUrl;
  assertEquals(fileUrl.path, "/absolute/path/to/chart");
  assertEquals(fileUrl.toString(), url);
});

Deno.test("parseRepoUrl: file URL relative", () => {
  const url = "file://relative/path/to/chart";
  const result = parseRepoUrl(url);
  if (typeof result === "string") {
    throw new Error("Expected FileUrl instance");
  }
  if (result.type !== "file") {
    throw new Error("Expected type 'file'");
  }
  const fileUrl = result as FileUrl;
  assertEquals(fileUrl.path, "relative/path/to/chart");
  assertEquals(fileUrl.toString(), url);
});

Deno.test("parseRepoUrl: git+ssh with ref and path", () => {
  const url = "git+ssh://git@github.com/example/charts.git?ref=main&path=charts";
  const result = parseRepoUrl(url);
  if (typeof result === "string") {
    throw new Error("Expected GitUrl instance");
  }
  if (result.type !== "git") {
    throw new Error("Expected type 'git'");
  }
  const gitUrl = result as GitUrl;
  assertEquals(gitUrl.protocol, "ssh");
  assertEquals(gitUrl.repo, "git@github.com/example/charts.git");
  assertEquals(gitUrl.ref, "main");
  assertEquals(gitUrl.rev, undefined);
  assertEquals(gitUrl.path, "charts");
  assertEquals(gitUrl.toString(), url);
});

Deno.test("parseRepoUrl: git+https with rev and path", () => {
  const url = "git+https://github.com/example/charts.git?rev=shasum&path=charts";
  const result = parseRepoUrl(url);
  if (typeof result === "string") {
    throw new Error("Expected GitUrl instance");
  }
  if (result.type !== "git") {
    throw new Error("Expected type 'git'");
  }
  const gitUrl = result as GitUrl;
  assertEquals(gitUrl.protocol, "https");
  assertEquals(gitUrl.repo, "github.com/example/charts.git");
  assertEquals(gitUrl.ref, undefined);
  assertEquals(gitUrl.rev, "shasum");
  assertEquals(gitUrl.path, "charts");
  assertEquals(gitUrl.toString(), url);
});

Deno.test("parseRepoUrl: git+https with username and password", () => {
  const url = "git+https://user:pass@github.com/example/charts.git?rev=shasum&path=charts";
  const result = parseRepoUrl(url);
  if (typeof result === "string") {
    throw new Error("Expected GitUrl instance");
  }
  if (result.type !== "git") {
    throw new Error("Expected type 'git'");
  }
  const gitUrl = result as GitUrl;
  assertEquals(gitUrl.protocol, "https");
  assertEquals(gitUrl.repo, "user:pass@github.com/example/charts.git");
  assertEquals(gitUrl.ref, undefined);
  assertEquals(gitUrl.rev, "shasum");
  assertEquals(gitUrl.path, "charts");
  assertEquals(gitUrl.toString(), url);
});

Deno.test("parseRepoUrl: plain https URL", () => {
  const url = "https://charts.example.com/my-charts";
  const result = parseRepoUrl(url);
  assertEquals(result, url);
});

Deno.test("parseRepoUrl: oci URL", () => {
  const url = "oci://registry.example.com/my-charts";
  const result = parseRepoUrl(url);
  assertEquals(result, url);
});

Deno.test("parseRepoUrl: unknown scheme", () => {
  const url = "foo://bar/baz";
  assertThrows(() => parseRepoUrl(url));
});

Deno.test("GitUrl.getRepoHashKey: ignores protocol, username, password, ref and rev", async () => {
  const a = new GitUrl("https", "foo:bar@github.com/example/charts.git", "main", undefined, "charts");
  const b = new GitUrl("https", "github.com/example/charts.git", undefined, undefined, "charts");
  const c = new GitUrl("ssh", "spam@github.com/example/charts.git", undefined, "main", "charts");
  const d = new GitUrl("ssh", "spam@github.com/example/charts", undefined, undefined, "charts");

  assertEquals(await a.getRepoHashKey(), await b.getRepoHashKey());
  assertEquals(await a.getRepoHashKey(), await c.getRepoHashKey());
  assertEquals(await a.getRepoHashKey(), await d.getRepoHashKey());
});

Deno.test("GitUrl.getNiceName:", () => {
  const a = new GitUrl("https", "foo:bar@github.com/example/charts.git", "main", undefined, "charts");
  const b = new GitUrl("https", "github.com/example/charts.git", undefined, undefined, "charts");
  const c = new GitUrl("ssh", "spam@github.com/example/charts.git", undefined, "main", "charts");
  const d = new GitUrl("ssh", "spam@github.com/example/charts", undefined, undefined, "charts");

  assertEquals(a.getPathName(), "example/charts");
  assertEquals(b.getPathName(), "example/charts");
  assertEquals(c.getPathName(), "example/charts");
  assertEquals(d.getPathName(), "example/charts");
});

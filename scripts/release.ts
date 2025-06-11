#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * This script updates the version of a package in `deno.json`, creates a corresponding tag and pushes
 * it to the remote repository.
 */

import * as semver from "jsr:@std/semver@^1.0.0";
import { run } from "../packages/helm-v1alpha1/src/git.ts";
import { assert } from "@std/assert/assert";

function usageAndExit(): never {
  console.error(
    "Usage: deno run scripts/release.ts <pkg> [<pkg> ...] <version | 'major' | 'minor' | 'patch'>",
  );
  Deno.exit(1);
}

const versionBumps = {
  "current": (semver: semver.SemVer): semver.SemVer => {
    return semver;
  },
  "major": (semver: semver.SemVer): semver.SemVer => {
    semver.major++;
    semver.minor = 0;
    semver.patch = 0;
    return semver;
  },
  "minor": (semver: semver.SemVer): semver.SemVer => {
    semver.minor++;
    semver.patch = 0;
    return semver;
  },
  "patch": (semver: semver.SemVer): semver.SemVer => {
    semver.patch++;
    return semver;
  },
};

async function gitAdd(filePaths: string[]) {
  console.trace("gitAdd", filePaths);
  await run(["git", "add", ...filePaths], { check: true });
}

async function gitCommit(message: string, { allowEmpty }: { allowEmpty: boolean }) {
  await run(["git", "commit", "-m", message, ...(allowEmpty ? ["--allow-empty"] : [])], { check: true });
}

async function gitTag(tagName: string, force: boolean) {
  const args = ["git", "tag", tagName, "-m", `Release ${tagName}`];
  if (force) {
    args.push("-f");
  }
  await run(args, { check: true });
}

async function gitPush(refs: string[], force: boolean) {
  const args = ["git", "push", "origin", ...refs];
  if (force) {
    args.push("--force");
  }
  await run(args, { check: true });
}

async function getDenoJsonVersion(pkg: string): Promise<string> {
  const denoJsonPath = `packages/${pkg}/deno.json`;
  try {
    const denoJson: { version?: string } = JSON.parse(await Deno.readTextFile(denoJsonPath));
    assert(denoJson.version, `Version not found in ${denoJsonPath}`);
    return denoJson.version;
  }
  catch (error) {
    console.error(`Failed to read or parse ${denoJsonPath}:`, error);
    Deno.exit(1);
  }
}

async function updateDenoJson(pkg: string, version: string, dry: boolean): Promise<[string, boolean]> {
  const denoJsonPath = `packages/${pkg}/deno.json`;
  const denoJson: { version: string } = JSON.parse(await Deno.readTextFile(denoJsonPath));
  if (denoJson.version !== version) {
    const oldVersion = denoJson.version;
    denoJson.version = version;
    if (!dry) {
      await Deno.writeTextFile(denoJsonPath, JSON.stringify(denoJson, null, 2) + "\n");
    }
    console.log(`Updated version in ${denoJsonPath} from ${oldVersion} to ${version}`);
    return [denoJsonPath, true];
  }
  return [denoJsonPath, false];
}

async function main() {
  const dry = !Deno.args.includes("--no-dry");
  if (dry) {
    console.log("Running in dry mode. No changes will be made.");
  }

  const args = {
    force: false,
    dry: true,
    pkgs: [] as string[],
  };

  for (const arg of Deno.args) {
    if (arg == "--force" || arg == "-f") {
      args.force = true;
    }
    else if (arg == "--no-dry") {
      args.dry = false;
    }
    else if (arg.startsWith("-")) {
      console.error(`Unknown argument: ${arg}`);
      usageAndExit();
    }
    else {
      args.pkgs.push(arg);
    }
  }

  if (args.pkgs.length < 2) {
    console.error("At least one package name and a version must be provided.");
    usageAndExit();
  }

  const version = args.pkgs.pop()!;
  const releasedVersions: Map<string, string> = new Map();

  for (let pkg of args.pkgs) {
    let pkgVersion = version;
    if (pkg.includes("@")) {
      pkgVersion = pkg.split("@")[1]!;
      pkg = pkg.split("@")[0]!;
    }
    if (pkgVersion in versionBumps) {
      const latestVersion = await getDenoJsonVersion(pkg);
      pkgVersion = semver.format(versionBumps[pkgVersion as keyof typeof versionBumps](semver.parse(latestVersion)));
    }

    releasedVersions.set(pkg, pkgVersion);
    const [denoJson, modified] = await updateDenoJson(pkg, pkgVersion, dry);
    if (!dry && modified) {
      await gitAdd([denoJson]);
    }
  }

  const tagNames = Array.from(releasedVersions.entries()).map(([pkg, version]) => `${pkg}@v${version}`);
  const releasesFormatted = tagNames.join(", ");
  console.log("Releasing", releasesFormatted, "...");

  console.log("Committing changes to Git...");
  if (!dry) {
    await gitCommit(`Release ${releasesFormatted}`, { allowEmpty: true });
  }

  console.log("Tagging ", ...tagNames);

  if (!dry) {
    for (const tag of tagNames) {
      await gitTag(tag, args.force);
    }
  }

  console.log("Pushing tags to remote repository...");
  if (!dry) {
    await gitPush(tagNames, args.force);
  }

  console.log("Success!");
}

await main();

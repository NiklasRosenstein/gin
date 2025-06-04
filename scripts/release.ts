#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * This script updates the version of a package in `deno.json`, creates a corresponding tag and pushes
 * it to the remote repository.
 */

import * as semver from "jsr:@std/semver@^1.0.0";
import { run } from "../packages/helm-v1alpha1/src/git.ts";

function usageAndExit(): never {
  console.error(
    "Usage: deno run scripts/release.ts [<pkg>@v<version> | <pkg> <version | 'major' | 'minor' | 'patch'>",
  );
  Deno.exit(1);
}

async function getLatestVersion(pkg: string): Promise<semver.SemVer | undefined> {
  const tags = await run(["git", "tag", "--list", `${pkg}@v*`], { check: true, stdout: "piped" });
  if (tags.code !== 0) {
    console.error("Failed to list Git tags.");
    Deno.exit(1);
  }
  const tagList = new TextDecoder().decode(tags.stdout).trim().split("\n");
  return tagList
    .map((tag) => tag.replace(`${pkg}@v`, ""))
    .map(semver.parse)
    .sort(semver.compare)
    .pop();
}

const versionBumps = {
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

async function gitCommit(message: string) {
  await run(["git", "commit", "-m", message], { check: true });
}

async function gitTag(tagName: string, force: boolean) {
  const args = ["git", "tag", tagName, "-m", `Release ${tagName}`];
  if (force) {
    args.push("-f");
  }
  await run(args, { check: true });
}

async function gitPush(tagName: string, force: boolean) {
  const args = ["git", "push", "origin", tagName];
  if (force) {
    args.push("--force");
  }
  await run(args, { check: true });
}

async function updateDenoJson(pkg: string, version: string, dry: boolean): Promise<[string, boolean]> {
  const denoJsonPath = `packages/${pkg}/deno.json`;
  const denoJson: { version: string } = JSON.parse(Deno.readTextFileSync(denoJsonPath));
  if (denoJson.version !== version) {
    denoJson.version = version;
    if (!dry) {
      await Deno.writeTextFile(denoJsonPath, JSON.stringify(denoJson, null, 2) + "\n");
    }
    console.log(`Updated version in ${denoJsonPath} to ${version}`);
    return [denoJsonPath, true];
  }
  return [denoJsonPath, false];
}

async function main() {
  const dry = !Deno.args.includes("--no-dry");
  if (dry) {
    console.log("Running in dry mode. No changes will be made.");
  }

  const force = Deno.args.includes("--force") || Deno.args.includes("-f");
  let [pkg, version] = Deno.args[0]!.split("@v");
  if (!pkg) {
    usageAndExit();
  }

  version = version || Deno.args[1];
  if (!version) {
    usageAndExit();
  }

  if (version in versionBumps) {
    const latestVersion = await getLatestVersion(pkg);
    if (!latestVersion) {
      console.error(`No previous version found for package ${pkg}.`);
      Deno.exit(1);
    }
    version = semver.format(versionBumps[version as keyof typeof versionBumps](latestVersion));
    console.log(`Latest version of ${pkg} is ${semver.format(latestVersion)}, bumping to ${version}.`);
  }

  const tagName = `${pkg}@v${version}`;
  const [denoJson, modified] = await updateDenoJson(pkg, version, dry);
  if (!dry) {
    if (modified) {
      await gitAdd([denoJson]);
      await gitCommit(`Update version of ${pkg} to ${version}`);
    }
    await gitTag(tagName, force);
    await gitPush(tagName, force);
  }

  console.log(
    `Successfully updated version of package '${pkg}' to ${version} and pushed tag '${tagName}' to remote repository.`,
  );
}

await main();

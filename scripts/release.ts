#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * This script updates the version of a package in `deno.json`, creates a corresponding tag and pushes
 * it to the remote repository.
 */

const [packageName, version] = Deno.args[0]!.split("@v");
if (!packageName || !version) {
  console.error("Usage: deno run scripts/picky-publisher.ts <packageName>@v<version>");
  Deno.exit(1);
}

const tagName = `${packageName}@v${version}`;
const force = Deno.args.includes("--force") || Deno.args.includes("-f");

const denoJsonPath = `${packageName}/deno.json`;
const denoJson = JSON.parse(Deno.readTextFileSync(denoJsonPath));
if (denoJson.version !== version) {
  denoJson.version = version;
  Deno.writeTextFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

  console.log(`Updated version in ${denoJsonPath} to ${version}`);

  const addResult = await new Deno.Command("git", {
    args: ["add", denoJsonPath],
  }).spawn().output();

  if (addResult.code !== 0) {
    const addError = new TextDecoder().decode(addResult.stderr);
    console.error(`Adding file to git failed:\n${addError}`);
    Deno.exit(1);
  }

  console.log(`Added ${denoJsonPath} to git staging area.`);

  const commitResult = await new Deno.Command("git", {
    args: ["commit", "-m", `Update version for ${packageName} to v${version}`],
  }).spawn().output();

  if (commitResult.code !== 0) {
    const commitError = new TextDecoder().decode(commitResult.stderr);
    console.error(`Committing changes failed:\n${commitError}`);
    Deno.exit(1);
  }
}

console.log(`Creating tag 'v${version}' for package '${packageName}' ...`);
const tagResult = await new Deno.Command("git", {
  args: ["tag", tagName, ...(force ? ["-f"] : []), "-m", `Release ${tagName}`],
}).spawn().output();

if (tagResult.code !== 0) {
  const tagError = new TextDecoder().decode(tagResult.stderr);
  console.error(`Tagging failed:\n${tagError}`);
  Deno.exit(1);
}

console.log(`Pushing tag '${tagName}' to remote repository ...`);
const pushResult = await new Deno.Command("git", {
  args: ["push", "origin", tagName, ...(force ? ["--force"] : [])],
}).spawn().output();

if (pushResult.code !== 0) {
  const pushError = new TextDecoder().decode(pushResult.stderr);
  console.error(`Pushing tag failed:\n${pushError}`);
  Deno.exit(1);
}

console.log(
  `Successfully updated version of package '${packageName}' to ${version} and pushed tag '${tagName}' to remote repository.`,
);

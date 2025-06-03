/**
 * This script updates the version of a package in `deno.json`, creates a corresponding tag and pushes
 * it to the remote repository.
 */

const [packageName, version] = Deno.args[0]!.split("@v");
if (!packageName || !version) {
  console.error("Usage: deno run scripts/picky-publisher.ts <packageName>@v<version>");
  Deno.exit(1);
}

console.log(`Updating version of package '${packageName}' to ${version} ...`);
const denoJsonPath = `${packageName}/deno.json`;
const denoJson = JSON.parse(Deno.readTextFileSync(denoJsonPath));
denoJson.version = version;
Deno.writeTextFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

console.log(`Creating tag 'v${version}' for package '${packageName}' ...`);
const tagName = `${packageName}@v${version}`;
const tagResult = await new Deno.Command("git", {
  args: ["tag", tagName],
  stdout: "piped",
  stderr: "piped",
}).spawn().output();

if (tagResult.code !== 0) {
  const tagError = new TextDecoder().decode(tagResult.stderr);
  console.error(`Tagging failed:\n${tagError}`);
  Deno.exit(1);
}

console.log(`Pushing tag '${tagName}' to remote repository ...`);
const pushResult = await new Deno.Command("git", {
  args: ["push", "origin", tagName],
  stdout: "piped",
  stderr: "piped",
}).spawn().output();

if (pushResult.code !== 0) {
  const pushError = new TextDecoder().decode(pushResult.stderr);
  console.error(`Pushing tag failed:\n${pushError}`);
  Deno.exit(1);
}

console.log(
  `Successfully updated version of package '${packageName}' to ${version} and pushed tag '${tagName}' to remote repository.`,
);

/**
 * This script parses a Git tag of the form `{pkg}@v{version}` and publishes the specified package.
 * If the `{version}` does not match the version defined in the `deno.json`, it will throw an error.
 */

let [packageName, version] = Deno.args[0]!.split("@v");
if (!packageName || !version) {
  console.error("Usage: deno run scripts/picky-publisher.ts <packageName>@v<version>");
  Deno.exit(1);
}

packageName = `packages/${packageName}`;

const denoJson = JSON.parse(Deno.readTextFileSync(`${packageName}/deno.json`));
if (denoJson.version !== version) {
  console.error(`Version mismatch: expected ${denoJson.version}, but got ${version}`);
  Deno.exit(1);
}

console.log(`Linting package '${packageName}' ...`);
const lintResult = await new Deno.Command(Deno.execPath(), {
  args: ["lint"],
  cwd: packageName,
}).spawn().output();

if (lintResult.code !== 0) {
  console.error(`Linting failed.`);
  Deno.exit(1);
}

console.log(`Testing package '${packageName}' ...`);
const testResult = await new Deno.Command(Deno.execPath(), {
  args: ["run", "./scripts/test-all.ts", packageName],
}).spawn().output();

if (testResult.code !== 0) {
  console.error(`Testing failed.`);
  Deno.exit(1);
}

console.log(`Publishing package '${packageName}' ...`);
const publishResult = await new Deno.Command(Deno.execPath(), {
  args: ["publish"],
  cwd: packageName,
}).spawn().output();

if (publishResult.code !== 0) {
  console.error(`Publishing failed.`);
  Deno.exit(1);
}

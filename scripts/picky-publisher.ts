/**
 * This script parses a Git tag of the form `{pkg}@v{version}` and publishes the specified package.
 * If the `{version}` does not match the version defined in the `deno.json`, it will throw an error.
 */

const [pkg, version] = Deno.args[0]!.split("@v");
if (!pkg || !version) {
  console.error("Usage: deno run scripts/picky-publisher.ts <packageName>@v<version>");
  Deno.exit(1);
}

const pkgPath = `packages/${pkg}`;

const denoJson = JSON.parse(Deno.readTextFileSync(`${pkgPath}/deno.json`));
if (denoJson.version !== version) {
  console.error(`Version mismatch: expected ${denoJson.version}, but got ${version}`);
  Deno.exit(1);
}

console.log(`Linting package '${pkgPath}' ...`);
const lintResult = await new Deno.Command(Deno.execPath(), {
  args: ["lint"],
  cwd: pkgPath,
}).spawn().output();

if (lintResult.code !== 0) {
  console.error(`Linting failed.`);
  Deno.exit(1);
}

console.log(`Checking formatting of package '${pkgPath}' ...`);
const fmtResult = await new Deno.Command(Deno.execPath(), {
  args: ["fmt", "--check"],
  cwd: pkgPath,
}).spawn().output();

if (fmtResult.code !== 0) {
  console.error(`Formatting check failed.`);
  Deno.exit(1);
}

console.log(`Testing package '${pkgPath}' ...`);
const testResult = await new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-all", "./scripts/test-all.ts", pkg],
}).spawn().output();

if (testResult.code !== 0) {
  console.error(`Testing failed.`);
  Deno.exit(1);
}

console.log(`Publishing package '${pkgPath}' ...`);
const publishResult = await new Deno.Command(Deno.execPath(), {
  args: ["publish"],
  cwd: pkgPath,
}).spawn().output();

if (publishResult.code !== 0) {
  console.error(`Publishing failed.`);
  Deno.exit(1);
}

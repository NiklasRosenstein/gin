#!/usr/bin/env -S deno run --allow-run=deno --allow-read
/**
 * Test all packages.
 */

let packages = Array.from(
  Deno.readDirSync("./packages")
    .filter((entry) => entry.isDirectory && entry.name !== "node_modules")
    .map((entry) => entry.name),
);

const onlyPackage = Deno.args[0];
if (onlyPackage) {
  packages = packages.filter((pkg) => pkg === onlyPackage);
  if (packages.length === 0) {
    console.error(`Package '${onlyPackage}' not found.`);
    Deno.exit(1);
  }
}

const statuses: Record<string, string> = {};

for (const pkg of packages) {
  const denoJson = JSON.parse(Deno.readTextFileSync(`./packages/${pkg}/deno.json`));
  const tasks = denoJson.tasks ?? {};

  let args: string[];
  if ("test-this" in tasks) {
    args = ["task", "test-this"];
  }
  else {
    args = ["test"];
  }

  console.log(`Testing package '${pkg}' ...`);
  const result = await new Deno.Command(Deno.execPath(), {
    args,
    cwd: `./packages/${pkg}`,
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  statuses[pkg] = result.code === 0 ? "ok" : "failed";
}

console.log("Test results:");
for (const [pkg, status] of Object.entries(statuses)) {
  console.log(`- ${pkg}: ${status}`);
}

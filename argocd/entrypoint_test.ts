import { assertEquals } from "@std/assert/equals";
import { parseParameters } from "./entrypoint.ts";

Deno.test("parseParameters - valid parameters", () => {
  const params = parseParameters([
    { name: "script", string: "test_script.ts" },
    { name: "deno_allow_all", string: "true" },
    { name: "deno_allow_net", array: ["example.com"] },
    { name: "deno_allow_read", array: ["file:///data"] },
    { name: "deno_allow_write", array: ["file:///output"] },
    { name: "deno_allow_env", array: ["MY_ENV_VAR"] },
    { name: "deno_allow_run", array: ["my_command"] },
    { name: "deno_allow_import", array: ["https://deno.land/x/some_module.ts"] },
  ]);

  assertEquals(params, {
    script: "test_script.ts",
    args: [],
    deno_allow_all: true,
    deno_allow_net: ["example.com"],
    deno_allow_read: ["file:///data"],
    deno_allow_write: ["file:///output"],
    deno_allow_env: ["MY_ENV_VAR"],
    deno_allow_run: ["my_command"],
    deno_allow_import: ["https://deno.land/x/some_module.ts"],
  });
});

import { SecretValue } from "@gin/core";
import { assertEquals } from "@std/assert/equals";
import { Sops } from "./mod.ts";
import { assertRejects } from "@std/assert";

Deno.test(async function testJsonPathInSopsGet() {
  const sops = new Sops({
    path: "<memory>",
    data: {
      stringValue: "test",
      numberValue: 42,
      objectValue: {
        nestedString: "nested",
        nestedNumber: 100,
      },
      arrayValue: [1, 2, 3],
      nestedArrayValue: [
        { key: "value1" },
        { key: "value2" },
      ],
    },
  });

  assertEquals(await sops.getString("stringValue"), SecretValue.of("test"));
  await assertRejects(
    () => sops.getString("numberValue"),
    Error,
    'Failed to resolve "string" secret "numberValue", expected "string" got "number".',
  );

  assertEquals(await sops.getArray("arrayValue"), SecretValue.of([1, 2, 3]));
  await assertRejects(
    () => sops.getArray("stringValue"),
    Error,
    'Failed to resolve "array" secret "stringValue", expected "array" got "string".',
  );
  await assertRejects(
    () => sops.getArray("objectValue"),
    Error,
    'Failed to resolve "array" secret "objectValue", expected "array" got "object".',
  );

  assertEquals(
    await sops.getObject("objectValue"),
    SecretValue.of({
      nestedString: "nested",
      nestedNumber: 100,
    }),
  );

  await assertRejects(
    () => sops.getObject("arrayValue"),
    Error,
    'Failed to resolve "object" secret "arrayValue", expected "object" got "array".',
  );

  assertEquals(await sops.getArray("nestedArrayValue[*].key"), SecretValue.of(["value1", "value2"]));
});

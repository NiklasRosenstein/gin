import { SecretValue } from "@gin/core";
import { assertEquals } from "@std/assert/equals";
import { Sops } from "./mod.ts";
import { assertRejects } from "@std/assert/rejects";

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
  assertRejects(
    () => sops.getString("numberValue"),
    'Failed to resolve "string" secret "numberValue", expected "string" got "number".',
  );

  assertEquals(await sops.getArray("arrayValue"), SecretValue.of([1, 2, 3]));
  assertRejects(
    () => sops.getArray("stringValue"),
    'Failed to resolve "array" secret "stringValue", expected "array" got "string".',
  );
  assertRejects(
    () => sops.getArray("objectValue"),
    'Failed to resolve "array" secret "objectValue", expected "array" got "object".',
  );

  assertEquals(
    await sops.getObject("objectValue"),
    SecretValue.of({
      nestedString: "nested",
      nestedNumber: 100,
    }),
  );
  assertRejects(
    () => sops.getObject("arrayValue"),
    'Failed to resolve "object" secret "objectValue", expected "object" got "array".',
  );

  assertEquals(await sops.getArray("nestedArrayValue[*].key"), SecretValue.of(["value1", "value2"]));
});

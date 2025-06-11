import { assertEquals } from "@std/assert/equals";
import { dropUndefined } from "./utils.ts";

Deno.test(function testDropUndefinedOnArray() {
  assertEquals(
    dropUndefined([1, undefined, 2, undefined, 3]),
    [1, 2, 3],
  );
});

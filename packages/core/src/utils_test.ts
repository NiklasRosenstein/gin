import { assertEquals } from "@std/assert/equals";
import { dropUndefined, getCallerFileAndLine } from "./utils.ts";
import type { KubernetesObject, Sink } from "@gin/core";
import { Gin } from "./gin.ts";
import { assert } from "@std/assert/assert";
import { assertStringIncludes } from "@std/assert/string-includes";

Deno.test(function testDropUndefinedOnArray() {
  assertEquals(
    dropUndefined([1, undefined, 2, undefined, 3]),
    [1, 2, 3],
  );
});

Deno.test("getCallerFileAndLine skips eventLoopTick frames", async () => {
  class CaptureSink implements Sink {
    captured: KubernetesObject[] = [];

    accept<T extends KubernetesObject>(resource: T): Promise<void> {
      this.captured.push(resource);
      return Promise.resolve();
    }

    close(): void {
      // No-op
    }
  }

  const sink = new CaptureSink();
  const gin = new Gin().withSink(sink);
  await gin.emit({ apiVersion: "v1", kind: "Pod", metadata: { name: "test-pod" } });
  await gin.emitMany([{ apiVersion: "v1", kind: "Pod", metadata: { name: "test-pod" } }]);

  assert(sink.captured.length == 2, "Expected one resource to be captured");
  assertStringIncludes(
    sink.captured[0]!.gin?.emittedFrom!,
    import.meta.filename!,
    "Expected resource to have gin.emittedFrom set to the current file",
  );
  assertStringIncludes(
    sink.captured[1]!.gin?.emittedFrom!,
    import.meta.filename!,
    "Expected resource to have gin.emittedFrom set to the current file",
  );
});

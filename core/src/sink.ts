import type { KubernetesObject } from "./mod.ts";
import { stringify } from "@eemeli/yaml";

/**
 * Sink interface for emitted Kubernetes resources.
 */
export interface Sink {
  /**
   * Accepts a Kubernetes resource and processes it.
   *
   * @param resource - The Kubernetes resource to process.
   */
  accept<T extends KubernetesObject>(resource: T): Promise<void>;

  /**
   * Closes the sink, indicating no more resources will be sent.
   */
  close(): void;
}

/**
 * Outputs Kubernetes resources to stdout in YAML format. This is the default sink.
 */
export class StdoutSink implements Sink {
  /**
   * Accepts a Kubernetes resource and outputs it to stdout in YAML format.
   *
   * @param resource - The Kubernetes resource to output.
   */
  accept<T extends KubernetesObject>(resource: T): Promise<void> {
    console.log("---");
    console.log(stringify(resource, null, 2));
    return Promise.resolve();
  }

  /**
   * Closes the sink. No additional resources will be accepted after this call.
   */
  close(): void {
    // No specific action needed for stdout sink
  }
}

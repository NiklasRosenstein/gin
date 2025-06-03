export interface KubernetesObject {
  apiVersion: string;
  kind: string;
  metadata: ObjectMeta;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

export interface ObjectMeta {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  finalizers?: string[];
  ownerReferences?: OwnerReference[];
}

export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
}

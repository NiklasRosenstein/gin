/**
 * @module crds
 *
 * This module exports interfaces for ArgoCD custom resources, i.e. `Application`, `AppProject` and `ApplicationSet`,
 * but also for for `Secret`-based resources such as repository credentials and templates (see {@link Repository}
 * and {@link RepositoryCredentialTemplate}) and cluster secrets (see {@link Cluster}).
 */

export * from "./crds-ai.ts";
import type { KubernetesObject, ObjectMeta, SecretValue } from "@gin/core";

/**
 * See
 * - https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/
 * - https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
 */
export interface RepositoryCredentialTemplate extends KubernetesObject {
  apiVersion: "v1";
  kind: "Secret";
  metadata: ObjectMeta & {
    labels: {
      "argocd.argoproj.io/secret-type": "repo-creds";
    };
  };
  data?: {
    "project"?: string;
    "name"?: string;
    "type": "git" | "helm";
    "url": string;
    "username"?: string;
    "password"?: SecretValue;
    "sshPrivateKey"?: SecretValue;
    "githubAppID"?: string;
    "githubAppInstallationID"?: string;
    "githubAppPrivateKey"?: SecretValue;
    "githubAppEnterpriseBaseUrl "?: string;
  };
  stringData?: RepositoryCredentialTemplate["data"];
}

/**
 * See
 * - https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
 * - https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
 */
export interface Repository extends KubernetesObject {
  apiVersion: "v1";
  kind: "Secret";
  metadata: ObjectMeta & {
    labels: {
      "argocd.argoproj.io/secret-type": "repository";
    };
  };
  data?: {
    "project"?: string;
    "name"?: string;
    "type"?: "git" | "helm";
    "url": string;
    "username"?: string;
    "password"?: SecretValue;
    "bearerToken"?: SecretValue;
    "sshPrivateKey"?: SecretValue;
    "insecure"?: "true" | "false";
    "forceHttpBasicAuth"?: "true" | "false";
    "enableLfs"?: "true" | "false";
    "enableOCI"?: "true" | "false";
    "useAzureWorkloadIdentity"?: "true" | "false";
  };
  stringData?: Repository["data"];
}

/**
 * See
 * - https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters
 */
export interface Cluster extends KubernetesObject {
  apiVersion: "v1";
  kind: "Secret";
  metadata: ObjectMeta & {
    labels: {
      "argocd.argoproj.io/secret-type": "cluster";
    };
  };
  data?: {
    "name"?: string;
    "server": string;
    "config"?: SecretValue;
  };
  stringData: Cluster["data"];
}

/**
 * See
 * - https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters
 */
export interface ClusterSecret {
  username?: string;
  password?: string;
  bearerToken?: string;
  awsAuthConfig?: {
    clusterName: string;
    roleARN: string;
    profile?: string;
  };
  execProviderConfig?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    apiVersion?: string;
    installHint?: string;
  };
  proxyUrl?: string;
  tlsClientConfig?: {
    caData?: string;
    certData?: string;
    insecure?: boolean;
    keyData?: string;
    serverName?: string;
  };
  disableCompression?: boolean;
}

/**
 * @module utils
 *
 * This module provides utility functions for generating ArgoCD custom resources, particularly useful for
 * an ArgoCD "App of apps" setup.
 */

import type { Application, Repository, RepositoryCredentialTemplate } from "@gin/argocd-v1alpha1";
import type { SecretValue } from "@gin/core";
import type { ResourceIgnoreDifferences } from "./crds-ai.ts";

/**
 * Generate an ArgoCD repository secret connected to a Git repository via HTTP(s) or SSH.
 *
 * @param {name} - The name of the repository as shown in ArgoCD. This name is not referenced elsewhere.
 * @param {project} - The ArgoCD project to which the repository belongs. If not specified, it defaults to "default".
 * @param {url} - The URL of the Git repository, which can be an HTTP(s) or SSH URL. If accessing the repository
 *   requires authentication, you must supply either `username` and `password` or `sshPrivateKey`, depending on the URL
 *   type. Also note that this URL needs to be referenced in an ArgoCD {@link Application} and not the `name`.
 * @param {username} - The username for HTTP(s) access to the repository.
 * @param {password} - The password for HTTP(s) access to the repository.
 * @param {sshPrivateKey} - The SSH private key for SSH access to the repository.
 * @returns {Repository} - A Kubernetes `Secret` object representing the repository, which will be understood by ArgoCD.
 */
export function GitRepository({
  name,
  project = "default",
  url,
  username,
  password,
  sshPrivateKey,
}: {
  name: string;
  project?: string;
  url: string;
  username?: string;
  password?: SecretValue;
  sshPrivateKey?: SecretValue;
}): Repository {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (sshPrivateKey) {
      throw new Error("For HTTP(s) repositories, do not provide an SSH private key.");
    }
  }
  else if (url.startsWith("ssh://") || url.startsWith("git@")) {
    if (!sshPrivateKey) {
      throw new Error("For SSH repositories, you must provide an SSH private key.");
    }
  }

  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name,
      namespace: "argocd",
      labels: {
        "argocd.argoproj.io/secret-type": "repository",
      },
    },
    stringData: {
      name,
      project: project,
      type: "git",
      url,
      username,
      password,
      sshPrivateKey,
    },
  };
}

/**
 * Generate an ArgoCD repository credential template that matches a Git repository from the given URL prefix.
 * When an ArgoCD {@link Application} references a repository that matches the credential template, it will
 * automatically use the credentials defined in the template.
 *
 * @param {name} - The name of the repository credential template.
 * @param {project} - The ArgoCD project to which the repository credential template belongs. If not specified,
 * @param {urlPrefix} - The URL prefix of the Git repository. This is a string that will be matched against the
 *   repository URL in the ArgoCD {@link Application}. If the repository URL starts with this prefix, the credentials
 *   from this template will be used.
 * @param {username} - The username for HTTP(s) access to the repository.
 * @param {password} - The password for HTTP(s) access to the repository.
 * @param {sshPrivateKey} - The SSH private key for SSH access to the repository.
 * @return {RepositoryCredentialTemplate} - A Kubernetes `Secret` object representing the repository credential
 *   template, which will be understood by ArgoCD.
 */
export function GitRepositoryCredentialTemplate({
  name,
  project = "default",
  urlPrefix,
  username,
  password,
  sshPrivateKey,
}: {
  name: string;
  project?: string;
  urlPrefix: string;
  username?: string;
  password?: SecretValue;
  sshPrivateKey?: SecretValue;
}): RepositoryCredentialTemplate {
  if (urlPrefix.startsWith("http://") || urlPrefix.startsWith("https://")) {
    if (sshPrivateKey) {
      throw new Error("For HTTP(s) repositories, do not provide an SSH private key.");
    }
  }
  else if (urlPrefix.startsWith("ssh://") || urlPrefix.startsWith("git@")) {
    if (!sshPrivateKey) {
      throw new Error("For SSH repositories, you must provide an SSH private key.");
    }
  }

  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name,
      namespace: "argocd",
      labels: {
        "argocd.argoproj.io/secret-type": "repo-creds",
      },
    },
    stringData: {
      name,
      project: project,
      type: "git",
      url: urlPrefix,
      username,
      password,
      sshPrivateKey,
    },
  };
}

/**
 * Generate an ArgoCD {@link Application} that uses Gin's ArgoCD plugin (`gin-v1`) to run a Deno script generating
 * Kubernetes resources.
 *
 * @param {name} - The name of the ArgoCD application.
 * @param {namespace} - The namespace in which the ArgoCD application will be created. This is typically "argocd".
 *   Applications in other namespaces must be enabled in ArgoCD; see https://argo-cd.readthedocs.io/en/latest/operator-manual/app-any-namespace/.
 * @param {project} - The ArgoCD project to which the application belongs. If not specified, it defaults to "default".
 * @param {script} - The path in the repository to the Deno script that will be executed by the Gin ArgoCD plugin.
 * @param {args} - An array of arguments that will be passed to the Deno script. These can be used to configure
 *   the script's behavior or to pass in dynamic values.\
 * @param {repository} - The URL of the Git repository that contains the Deno script.
 * @param {targetCluster} - The Kubernetes API server that the application will be deployed to. This can be an
 *   `https://` URL, in which case it will be passed to {@link ApplicationDestination#server}. Any other value is
 *   instead passed to {@link ApplicationDestination#name}, treating it as the alias for the target cluster.
 * @param {targetNamespace} - The namespace in the target cluster where the application will be deployed.
 * @param {revision} - The Git revision (branch, tag, or commit) to use for the application. If not specified,
 *   it defaults to "HEAD".
 * @param {syncOptions} - An array of sync options to apply to the application. Defaults to `["ServerSideApply=true"]`.
 * @param {ignoreDifferences} - An array of resource ignore differences to apply to the application. This can be used
 *   to ignore specific differences in resources that should not trigger a sync. For example, you can ignore
 *   differences in the `status` field of resources. If not specified, it defaults to
 *   {@link STANDARD_IGNORE_DIFFERENCES}.
 * @param {deno} - Security options for the Deno runtime when executing the script. If `allowDefault` is not set, or
 *   set to `true`, the script will be allowed to run `helm` and `sops`, as well as given read and write access to
 *   the `/tmp/gin` directory that is used as a cache directory and the permission to read the `GIN_CACHE_DIR`
 *   environment variable.
 */
export function GinApplication({
  name,
  namespace = "argocd",
  project = "default",
  script,
  args = [],
  repository,
  revision = "HEAD",
  targetCluster = "in-cluster",
  targetNamespace,
  syncOptions = ["ServerSideApply=true"],
  ignoreDifferences,
  autoApply = false,
  autoPrune = false,
  autoSelfHeal = false,
  deno = {},
}: {
  name: string;
  namespace?: string;
  project?: string;
  script: string;
  args?: string[];
  repository: string;
  revision?: string;
  targetCluster?: string;
  targetNamespace?: string;
  syncOptions?: string[];
  ignoreDifferences?: ResourceIgnoreDifferences[];
  autoApply?: boolean;
  autoPrune?: boolean;
  autoSelfHeal?: boolean;
  deno?: {
    allowDefault?: boolean;
    allowAll?: boolean;
    allowNet?: string[];
    allowRead?: string[];
    allowWrite?: string[];
    allowEnv?: string[];
    allowRun?: string[];
    allowImport?: string[];
  };
}): Application {
  let {
    allowDefault = true,
    allowAll = false,
    allowNet = [],
    allowRead = [],
    allowWrite = [],
    allowEnv = [],
    allowRun = [],
    allowImport = [],
  } = deno;

  if (allowDefault) {
    allowRead = ["/tmp/gin", ...allowRead];
    allowWrite = ["/tmp/gin", ...allowWrite];
    allowEnv = ["GIN_CACHE_DIR", ...allowEnv];
    allowRun = ["helm", "sops", ...allowRun];
  }

  return {
    apiVersion: "argoproj.io/v1alpha1",
    kind: "Application",
    metadata: {
      name,
      namespace: namespace,
    },
    spec: {
      project: project,
      destination: {
        server: targetCluster.startsWith("https://") ? targetCluster : undefined,
        name: targetCluster.startsWith("https://") ? undefined : targetCluster,
        namespace: targetNamespace,
      },
      source: {
        repoURL: repository,
        targetRevision: revision,
        path: ".", // TODO: Can we use this parameter to indicate the script path instead?
        plugin: {
          name: "gin-v1",
          env: [
            { name: "GIN_CACHE_DIR", value: "/tmp/gin" },
          ],
          parameters: [
            { name: "script", string: script },
            { name: "args", array: args },
            { name: "deno_allow_all", string: allowAll ? "true" : "false" },
            { name: "deno_allow_net", array: allowNet },
            { name: "deno_allow_read", array: allowRead },
            { name: "deno_allow_write", array: allowWrite },
            { name: "deno_allow_env", array: allowEnv },
            { name: "deno_allow_run", array: allowRun },
            { name: "deno_allow_import", array: allowImport },
          ],
        },
      },
      syncPolicy: {
        automated: {
          enabled: autoApply,
          prune: autoPrune,
          selfHeal: autoSelfHeal,
        },
        syncOptions: syncOptions,
      },
      ignoreDifferences: ignoreDifferences ?? STANDARD_IGNORE_DIFFERENCES,
    },
  };
}

/**
 * An array of standard resource ignore differences that are commonly used in ArgoCD applications.
 */
export const STANDARD_IGNORE_DIFFERENCES: ResourceIgnoreDifferences[] = [
  {
    group: "apps",
    kind: "StatefulSet",
    jqPathExpressions: [
      ".spec.volumeClaimTemplates[]?.apiVersion",
      ".spec.volumeClaimTemplates[]?.kind",
    ],
  },
  {
    group: "",
    kind: "PersistentVolumeClaim",
    jqPathExpressions: [
      ".spec.volumeName", // Might be set automatically and is immutable after the fact
    ],
  },
];

/**
 * This module provides the ArgoCD CRDs as TypeScript interfaces.
 *
 * Sidenote: This file is mostly AI-generated with the same prompt as {@link module:values} plus the following
 * addition to the prompt:
 *
 * ```
 * Now generate the same for the attached ArgoCD CRDs. The interfaces should extend from `KubernetesObject`
 * imported from `@gin/core` and overwrite the apiVersion and kind with literal types. Do not include the resource status
 * fields. Export all interfaces.
 * ```
 */

import type { KubernetesObject } from "@gin/core";

// #################################################
// # Common & Reusable Interfaces from CRDs        #
// #################################################

/**
 * Represents a Kubernetes label selector.
 */
export interface LabelSelector {
  matchExpressions?: {
    key: string;
    operator: string;
    values?: string[];
  }[];
  matchLabels?: Record<string, string>;
}

/**
 * Specifies a Group and a Kind, but does not force a version. This is useful for identifying
 * concepts during lookup stages without having partially valid types.
 */
export interface GroupKind {
  group: string;
  kind: string;
}

/**
 * Represents a variable to be passed to jsonnet during manifest generation.
 */
export interface JsonnetVar {
  code?: boolean;
  name: string;
  value: string;
}

/**
 * Holds options specific to Jsonnet.
 */
export interface ApplicationSourceJsonnet {
  /**
   * A list of Jsonnet External Variables.
   */
  extVars?: JsonnetVar[];
  /**
   * Additional library search dirs.
   */
  libs?: string[];
  /**
   * A list of Jsonnet Top-level Arguments.
   */
  tlas?: JsonnetVar[];
}

/**
 * Holds path/directory specific options.
 */
export interface ApplicationSourceDirectory {
  /**
   * A glob pattern to match paths against that should be explicitly excluded from
   * being used during manifest generation.
   */
  exclude?: string;
  /**
   * A glob pattern to match paths against that should be explicitly included during
   * manifest generation.
   */
  include?: string;
  /**
   * Options specific to Jsonnet.
   * {@link ApplicationSourceJsonnet}
   */
  jsonnet?: ApplicationSourceJsonnet;
  /**
   * Specifies whether to scan a directory recursively for manifests.
   */
  recurse?: boolean;
}

/**
 * A file parameter that's passed to helm template during manifest generation.
 */
export interface HelmFileParameter {
  /**
   * The name of the Helm parameter.
   */
  name?: string;
  /**
   * The path to the file containing the values for the Helm parameter.
   */
  path?: string;
}

/**
 * A parameter that's passed to helm template during manifest generation.
 */
export interface HelmParameter {
  /**
   * Determines whether to tell Helm to interpret booleans and numbers as strings.
   */
  forceString?: boolean;
  /**
   * The name of the Helm parameter.
   */
  name?: string;
  /**
   * The value for the Helm parameter.
   */
  value?: string;
}

/**
 * Holds helm specific options.
 */
export interface ApplicationSourceHelm {
  /**
   * The Kubernetes resource API versions to pass to Helm when templating manifests. By default,
   * Argo CD uses the API versions of the target cluster. The format is [group/]version/kind.
   */
  apiVersions?: string[];
  /**
   * File parameters to the helm template.
   */
  fileParameters?: HelmFileParameter[];
  /**
   * Prevents helm template from failing when valueFiles do not exist locally by
   * not appending them to helm template --values.
   */
  ignoreMissingValueFiles?: boolean;
  /**
   * The Kubernetes API version to pass to Helm when templating manifests. By default, Argo CD
   * uses the Kubernetes version of the target cluster.
   */
  kubeVersion?: string;
  /**
   * An optional namespace to template with. If left empty, defaults to the app's destination
   * namespace.
   */
  namespace?: string;
  /**
   * A list of Helm parameters which are passed to the helm template command upon manifest
   * generation.
   */
  parameters?: HelmParameter[];
  /**
   * Pass credentials to all domains (Helm's --pass-credentials).
   */
  passCredentials?: boolean;
  /**
   * The Helm release name to use. If omitted it will use the application name.
   */
  releaseName?: string;
  /**
   * Skips custom resource definition installation step (Helm's --skip-crds).
   */
  skipCrds?: boolean;
  /**
   * Skips JSON schema validation (Helm's --skip-schema-validation).
   */
  skipSchemaValidation?: boolean;
  /**
   * Skips test manifest installation step (Helm's --skip-tests).
   */
  skipTests?: boolean;
  /**
   * A list of Helm value files to use when generating a template.
   */
  valueFiles?: string[];
  /**
   * Specifies Helm values to be passed to helm template, typically defined as a block. ValuesObject
   * takes precedence over Values, so use one or the other.
   */
  values?: string;
  /**
   * Specifies Helm values to be passed to helm template, defined as a map. This takes
   * precedence over Values.
   */
  valuesObject?: Record<string, unknown>;
  /**
   * The Helm version to use for templating ("3").
   */
  version?: string;
}

/**
 * Represents a Kustomize patch.
 */
export interface KustomizePatch {
  options?: Record<string, boolean>;
  patch?: string;
  path?: string;
  target?: {
    annotationSelector?: string;
    group?: string;
    kind?: string;
    labelSelector?: string;
    name?: string;
    namespace?: string;
    version?: string;
  };
}

/**
 * Represents a Kustomize replicas override.
 */
export interface KustomizeReplica {
  /**
   * Number of replicas.
   */
  count: number | string;
  /**
   * Name of Deployment or StatefulSet.
   */
  name: string;
}

/**
 * Holds kustomize specific options.
 */
export interface ApplicationSourceKustomize {
  /**
   * The Kubernetes resource API versions to pass to kustomize when building manifests.
   */
  apiVersions?: string[];
  /**
   * A list of additional annotations to add to rendered manifests.
   */
  commonAnnotations?: Record<string, string>;
  /**
   * Specifies whether to apply env variables substitution for annotation values.
   */
  commonAnnotationsEnvsubst?: boolean;
  /**
   * A list of additional labels to add to rendered manifests.
   */
  commonLabels?: Record<string, string>;
  /**
   * A list of kustomize components to add to the kustomization before building.
   */
  components?: string[];
  /**
   * Specifies whether to force applying common annotations to resources for Kustomize apps.
   */
  forceCommonAnnotations?: boolean;
  /**
   * Specifies whether to force applying common labels to resources for Kustomize apps.
   */
  forceCommonLabels?: boolean;
  /**
   * Prevents kustomize from failing when components do not exist locally.
   */
  ignoreMissingComponents?: boolean;
  /**
   * A list of Kustomize image override specifications.
   */
  images?: string[];
  /**
   * The Kubernetes version to pass to kustomize when building manifests.
   */
  kubeVersion?: string;
  /**
   * Specifies whether to apply common labels to resource templates or not.
   */
  labelIncludeTemplates?: boolean;
  /**
   * Specifies whether to apply common labels to resource selectors or not.
   */
  labelWithoutSelector?: boolean;
  /**
   * A prefix appended to resources for Kustomize apps.
   */
  namePrefix?: string;
  /**
   * A suffix appended to resources for Kustomize apps.
   */
  nameSuffix?: string;
  /**
   * Sets the namespace that Kustomize adds to all resources.
   */
  namespace?: string;
  /**
   * A list of Kustomize patches.
   */
  patches?: KustomizePatch[];
  /**
   * A list of Kustomize Replicas override specifications.
   */
  replicas?: KustomizeReplica[];
  /**
   * Controls which version of Kustomize to use for rendering manifests.
   */
  version?: string;
}

/**
 * Represents a parameter for a config management plugin.
 */
export interface PluginParameter {
  /**
   * The value of an array type parameter.
   */
  array?: string[];
  /**
   * The value of a map type parameter.
   */
  map?: Record<string, string>;
  /**
   * The name identifying a parameter.
   */
  name?: string;
  /**
   * The value of a string type parameter.
   */
  string?: string;
}

/**
 * Holds config management plugin specific options.
 */
export interface ApplicationSourcePlugin {
  /**
   * A list of environment variable entries.
   */
  env?: {
    name: string;
    value: string;
  }[];
  name?: string;
  parameters?: PluginParameter[];
}

/**
 * Contains all required information about the source of an application.
 */
export interface ApplicationSource {
  /**
   * A Helm chart name, and must be specified for applications sourced from a Helm repo.
   */
  chart?: string;
  /**
   * Path/directory specific options.
   * {@link ApplicationSourceDirectory}
   */
  directory?: ApplicationSourceDirectory;
  /**
   * Helm specific options.
   * {@link ApplicationSourceHelm}
   */
  helm?: ApplicationSourceHelm;
  /**
   * Kustomize specific options.
   * {@link ApplicationSourceKustomize}
   */
  kustomize?: ApplicationSourceKustomize;
  /**
   * Used to refer to a source and is displayed in the UI. It is used in multi-source Applications.
   */
  name?: string;
  /**
   * A directory path within the Git repository, and is only valid for applications sourced from Git.
   */
  path?: string;
  /**
   * Config management plugin specific options.
   * {@link ApplicationSourcePlugin}
   */
  plugin?: ApplicationSourcePlugin;
  /**
   * A reference to another source within sources field. This field will not be used if used with a `source` tag.
   */
  ref?: string;
  /**
   * The URL to the repository (Git or Helm) that contains the application manifests.
   */
  repoURL: string;
  /**
   * Defines the revision of the source to sync the application to.
   * In case of Git, this can be commit, tag, or branch. If omitted, will equal to HEAD.
   * In case of Helm, this is a semver tag for the Chart's version.
   */
  targetRevision?: string;
}

/**
 * Holds information about the application's destination.
 */
export interface ApplicationDestination {
  /**
   * An alternate way of specifying the target cluster by its symbolic name.
   */
  name?: string;
  /**
   * The target namespace for the application's resources.
   */
  namespace?: string;
  /**
   * The URL of the target cluster's Kubernetes control plane API.
   */
  server?: string;
}

/**
 * Contains resource filter and list of json paths which should be ignored during comparison with live state.
 */
export interface ResourceIgnoreDifferences {
  group?: string;
  jqPathExpressions?: string[];
  jsonPointers?: string[];
  kind: string;
  /**
   * A list of trusted managers. Fields mutated by those managers will take precedence over the
   * desired state defined in the SCM and won't be displayed in diffs.
   */
  managedFieldsManagers?: string[];
  name?: string;
  namespace?: string;
}

/**
 * Controls when and how a sync will be performed.
 */
export interface ApplicationSyncPolicy {
  /**
   * Will keep an application synced to the target revision.
   */
  automated?: {
    /**
     * Allows apps have zero live resources (default: false).
     */
    allowEmpty?: boolean;
    /**
     * Allows apps to explicitly control automated sync.
     */
    enabled?: boolean;
    /**
     * Specifies whether to delete resources from the cluster that are not found in the sources anymore
     * as part of automated sync (default: false).
     */
    prune?: boolean;
    /**
     * Specifies whether to revert resources back to their desired state upon modification in the cluster
     * (default: false).
     */
    selfHeal?: boolean;
  };
  /**
   * Controls metadata in the given namespace (if CreateNamespace=true).
   */
  managedNamespaceMetadata?: {
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  };
  /**
   * Controls failed sync retry behavior.
   * {@link RetryStrategy}
   */
  retry?: RetryStrategy;
  /**
   * Options allow you to specify whole app sync-options.
   */
  syncOptions?: string[];
}

/**
 * Controls the strategy to apply if a sync fails.
 */
export interface RetryStrategy {
  /**
   * Controls how to backoff on subsequent retries of failed syncs.
   */
  backoff?: {
    /**
     * The amount to back off. Default unit is seconds, but could also be a duration (e.g. "2m", "1h").
     */
    duration?: string;
    /**
     * A factor to multiply the base duration after each failed retry.
     */
    factor?: number;
    /**
     * The maximum amount of time allowed for the backoff strategy.
     */
    maxDuration?: string;
  };
  /**
   * The maximum number of attempts for retrying a failed sync. If set to 0, no retries will be performed.
   */
  limit?: number;
}

/**
 * Provides a way to push hydrated manifests back to git before syncing them to the cluster.
 */
export interface SourceHydrator {
  /**
   * Specifies where the dry "don't repeat yourself" manifest source lives.
   */
  drySource: {
    /**
     * A directory path within the Git repository where the manifests are located.
     */
    path: string;
    /**
     * The URL to the git repository that contains the application manifests.
     */
    repoURL: string;
    /**
     * Defines the revision of the source to hydrate.
     */
    targetRevision: string;
  };
  /**
   * Specifies an optional "staging" location to push hydrated manifests to. An external system would then
   * have to move manifests to the SyncSource, e.g. by pull request.
   */
  hydrateTo?: {
    /**
     * The branch to which hydrated manifests should be committed.
     */
    targetBranch: string;
  };
  /**
   * Specifies where to sync hydrated manifests from.
   */
  syncSource: {
    /**
     * A directory path within the git repository where hydrated manifests should be committed to and synced
     * from. If hydrateTo is set, this is just the path from which hydrated manifests will be synced.
     */
    path: string;
    /**
     * The branch to which hydrated manifests should be committed.
     */
    targetBranch: string;
  };
}

// #################################################
// # Application CRD Interfaces                    #
// #################################################

/**
 * Represents desired application state. Contains link to repository with application definition
 * and additional parameters link definition revision.
 */
export interface ApplicationSpec {
  /**
   * A reference to the target Kubernetes server and namespace.
   * {@link ApplicationDestination}
   */
  destination: ApplicationDestination;
  /**
   * A list of resources and their fields which should be ignored during comparison.
   * {@link ResourceIgnoreDifferences}
   */
  ignoreDifferences?: ResourceIgnoreDifferences[];
  /**
   * A list of information (URLs, email addresses, and plain text) that relates to the application.
   */
  info?: { name: string; value: string }[];
  /**
   * A reference to the project this application belongs to. The empty string means that application
   * belongs to the 'default' project.
   */
  project: string;
  /**
   * Limits the number of items kept in the application's revision history.
   * Default is 10.
   */
  revisionHistoryLimit?: number;
  /**
   * A reference to the location of the application's manifests or chart.
   * {@link ApplicationSource}
   */
  source?: ApplicationSource;
  /**
   * A way to push hydrated manifests back to git before syncing them to the cluster.
   * {@link SourceHydrator}
   */
  sourceHydrator?: SourceHydrator;
  /**
   * A reference to the location of the application's manifests or chart (for multi-source apps).
   * {@link ApplicationSource}
   */
  sources?: ApplicationSource[];
  /**
   * Controls when and how a sync will be performed.
   * {@link ApplicationSyncPolicy}
   */
  syncPolicy?: ApplicationSyncPolicy;
}

/**
 * Contains parameters for a sync operation.
 */
export interface SyncOperation {
  /**
   * The number of auto-heal attempts.
   */
  autoHealAttemptsCount?: number;
  /**
   * Specifies to perform a `kubectl apply --dry-run` without actually performing the sync.
   */
  dryRun?: boolean;
  /**
   * An optional field that overrides sync source with a local directory for development.
   */
  manifests?: string[];
  /**
   * Specifies to delete resources from the cluster that are no longer tracked in git.
   */
  prune?: boolean;
  /**
   * Describes which resources shall be part of the sync.
   */
  resources?: {
    group?: string;
    kind: string;
    name: string;
    namespace?: string;
  }[];
  /**
   * The revision (Git) or chart version (Helm) which to sync the application to.
   * If omitted, will use the revision specified in app spec.
   */
  revision?: string;
  /**
   * The list of revisions to sync each source to.
   */
  revisions?: string[];
  /**
   * Overrides the source definition set in the application.
   * {@link ApplicationSource}
   */
  source?: ApplicationSource;
  /**
   * Overrides the sources definition set in the application.
   * {@link ApplicationSource}
   */
  sources?: ApplicationSource[];
  /**
   * Provide per-sync sync-options, e.g. Validate=false.
   */
  syncOptions?: string[];
  /**
   * Describes how to perform the sync.
   */
  syncStrategy?: {
    /**
     * Perform a `kubectl apply` to perform the sync.
     */
    apply?: {
      /**
       * Indicates whether or not to supply the --force flag to `kubectl apply`.
       */
      force?: boolean;
    };
    /**
     * Submit any referenced resources to perform the sync. This is the default strategy.
     */
    hook?: {
      /**
       * Indicates whether or not to supply the --force flag to `kubectl apply`.
       */
      force?: boolean;
    };
  };
}

/**
 * Contains information about a requested or running operation.
 */
export interface ApplicationOperation {
  /**
   * A list of informational items for this operation.
   */
  info?: { name: string; value: string }[];
  /**
   * Information about who initiated the operations.
   */
  initiatedBy?: {
    /**
     * Set to true if operation was initiated automatically by the application controller.
     */
    automated?: boolean;
    /**
     * The name of a user who started operation.
     */
    username?: string;
  };
  /**
   * The strategy to apply if a sync fails.
   * {@link RetryStrategy}
   */
  retry?: RetryStrategy;
  /**
   * Parameters for the operation.
   * {@link SyncOperation}
   */
  sync?: SyncOperation;
}

/**
 * A definition of an Application resource.
 */
export interface Application extends KubernetesObject {
  /**
   * The versioned schema of this representation of an object.
   */
  apiVersion: "argoproj.io/v1alpha1";
  /**
   * The REST resource this object represents.
   */
  kind: "Application";
  /**
   * The desired application state.
   * {@link ApplicationSpec}
   */
  spec: ApplicationSpec;
  /**
   * Information about a requested or running operation.
   * {@link ApplicationOperation}
   */
  operation?: ApplicationOperation;
}

// #################################################
// # AppProject CRD Interfaces                     #
// #################################################

/**
 * Represents a role that has access to a project.
 */
export interface ProjectRole {
  /**
   * A description of the role.
   */
  description?: string;
  /**
   * A list of OIDC group claims bound to this role.
   */
  groups?: string[];
  /**
   * A list of generated JWT tokens bound to this role.
   */
  jwtTokens?: {
    exp?: number;
    iat: number;
    id?: string;
  }[];
  /**
   * A name for this role.
   */
  name: string;
  /**
   * A list of casbin formatted strings that define access policies for the role in the project.
   */
  policies?: string[];
}

/**
 * A reference to a resource to be ignored from orphaned resources monitoring.
 */
export interface OrphanedResourceKey {
  group?: string;
  kind?: string;
  name?: string;
}

/**
 * Controls when syncs can be run for apps in this project.
 */
export interface SyncWindow {
  /**
   * Use AND operator for matching applications, namespaces and clusters instead of the default OR operator.
   */
  andOperator?: boolean;
  /**
   * A list of applications that the window will apply to.
   */
  applications?: string[];
  /**
   * A list of clusters that the window will apply to.
   */
  clusters?: string[];
  /**
   * A description of the sync that will be applied to the schedule.
   */
  description?: string;
  /**
   * The amount of time the sync window will be open.
   */
  duration?: string;
  /**
   * Defines if the window allows or blocks syncs.
   */
  kind?: string;
  /**
   * Enables manual syncs when they would otherwise be blocked.
   */
  manualSync?: boolean;
  /**
   * A list of namespaces that the window will apply to.
   */
  namespaces?: string[];
  /**
   * The time the window will begin, specified in cron format.
   */
  schedule?: string;
  /**
   * The time zone of the sync that will be applied to the schedule.
   */
  timeZone?: string;
}

/**
 * Holds information about the service accounts to be impersonated for the application sync operation.
 */
export interface ApplicationDestinationServiceAccount {
  /**
   * Service account to be used for impersonation during the sync operation.
   */
  defaultServiceAccount: string;
  /**
   * The target namespace for the application's resources.
   */
  namespace?: string;
  /**
   * The URL of the target cluster's Kubernetes control plane API.
   */
  server: string;
}

/**
 * The specification of an AppProject.
 */
export interface AppProjectSpec {
  /**
   * A list of blacklisted cluster level resources.
   */
  clusterResourceBlacklist?: GroupKind[];
  /**
   * A list of whitelisted cluster level resources.
   */
  clusterResourceWhitelist?: GroupKind[];
  /**
   * Optional project description.
   */
  description?: string;
  /**
   * Holds information about the service accounts to be impersonated.
   */
  destinationServiceAccounts?: ApplicationDestinationServiceAccount[];
  /**
   * A list of destinations available for deployment.
   * {@link ApplicationDestination}
   */
  destinations?: ApplicationDestination[];
  /**
   * A list of blacklisted namespace level resources.
   */
  namespaceResourceBlacklist?: GroupKind[];
  /**
   * A list of whitelisted namespace level resources.
   */
  namespaceResourceWhitelist?: GroupKind[];
  /**
   * Specifies if controller should monitor orphaned resources of apps in this project.
   */
  orphanedResources?: {
    /**
     * A list of resources that are to be excluded from orphaned resources monitoring.
     */
    ignore?: OrphanedResourceKey[];
    /**
     * Indicates if warning condition should be created for apps which have orphaned resources.
     */
    warn?: boolean;
  };
  /**
   * Determines whether destinations can only reference clusters which are project-scoped.
   */
  permitOnlyProjectScopedClusters?: boolean;
  /**
   * User defined RBAC roles associated with this project.
   */
  roles?: ProjectRole[];
  /**
   * A list of PGP key IDs that commits in Git must be signed with in order to be allowed for sync.
   */
  signatureKeys?: {
    /**
     * The ID of the key in hexadecimal notation.
     */
    keyID: string;
  }[];
  /**
   * Defines the namespaces application resources are allowed to be created in.
   */
  sourceNamespaces?: string[];
  /**
   * A list of repository URLs which can be used for deployment.
   */
  sourceRepos?: string[];
  /**
   * Controls when syncs can be run for apps in this project.
   */
  syncWindows?: SyncWindow[];
}

/**
 * AppProject provides a logical grouping of applications.
 */
export interface AppProject extends KubernetesObject {
  /**
   * The versioned schema of this representation of an object.
   */
  apiVersion: "argoproj.io/v1alpha1";
  /**
   * The REST resource this object represents.
   */
  kind: "AppProject";
  /**
   * The specification of an AppProject.
   * {@link AppProjectSpec}
   */
  spec: AppProjectSpec;
}

// #################################################
// # ApplicationSet CRD Interfaces                 #
// #################################################

/**
 * A template for an Argo CD Application.
 */
export interface ApplicationSetTemplate {
  metadata: {
    annotations?: Record<string, string>;
    finalizers?: string[];
    labels?: Record<string, string>;
    name?: string;
    namespace?: string;
  };
  spec: ApplicationSpec;
}

/**
 * The template for a generator.
 */
export type GeneratorTemplate = Omit<ApplicationSetTemplate, "spec"> & {
  spec: Omit<ApplicationSpec, "source" | "sources"> & {
    source?: Omit<ApplicationSource, "name">;
    sources?: Omit<ApplicationSource, "name">[];
  };
};

/**
 * The base interface for all generators.
 */
export interface GeneratorBase {
  /**
   * The template for the applications.
   * {@link GeneratorTemplate}
   */
  template?: GeneratorTemplate;
  /**
   * Additional values to be passed to the template.
   */
  values?: Record<string, string>;
}

/**
 * Generator for selecting clusters.
 */
export interface ClusterGenerator extends GeneratorBase {
  flatList?: boolean;
  selector?: LabelSelector;
}

/**
 * Generator for iterating over files or directories in a Git repository.
 */
export interface GitGenerator extends GeneratorBase {
  directories?: {
    exclude?: boolean;
    path: string;
  }[];
  files?: {
    exclude?: boolean;
    path: string;
  }[];
  pathParamPrefix?: string;
  repoURL: string;
  requeueAfterSeconds?: number;
  revision: string;
}

/**
 * Generator for a fixed list of elements.
 */
export interface ListGenerator extends GeneratorBase {
  elements?: Record<string, unknown>[];
  elementsYaml?: string;
}

/**
 * Generator for combining parameters from other generators.
 */
export interface BaseMatrixMergeGenerator {
  /**
   * The template for the applications.
   * {@link ApplicationSetTemplate}
   */
  template?: ApplicationSetTemplate;
}

/**
 * A union of all possible nested generators.
 */
export type NestedGenerator =
  | { clusterDecisionResource: ClusterDecisionResourceGenerator }
  | { clusters: ClusterGenerator }
  | { git: GitGenerator }
  | { list: ListGenerator }
  | { matrix: Record<string, unknown> }
  | { merge: Record<string, unknown> }
  | { plugin: PluginGenerator }
  | { pullRequest: PullRequestGenerator }
  | { scmProvider: ScmProviderGenerator }
  | { selector: LabelSelector };

/**
 * Generator that combines the parameters of other generators.
 */
export interface MatrixGenerator extends BaseMatrixMergeGenerator {
  generators: NestedGenerator[];
}

/**
 * Generator that merges the parameters of other generators.
 */
export interface MergeGenerator extends BaseMatrixMergeGenerator {
  generators: NestedGenerator[];
  mergeKeys: string[];
}

/**
 * Generator for using a config management plugin.
 */
export interface PluginGenerator extends GeneratorBase {
  configMapRef: { name: string };
  input?: {
    parameters?: Record<string, unknown>;
  };
  requeueAfterSeconds?: number;
}

/**
 * A reference to a secret key.
 */
export interface SecretKeyRef {
  key: string;
  secretName: string;
}

/**
 * A reference to a config map key.
 */
export interface ConfigMapKeyRef {
  configMapName: string;
  key: string;
}

/**
 * Configuration for a pull request generator for different SCM providers.
 */
export interface PullRequestGenerator extends GeneratorBase {
  azuredevops?: {
    api?: string;
    labels?: string[];
    organization: string;
    project: string;
    repo: string;
    tokenRef?: SecretKeyRef;
  };
  bitbucket?: {
    api?: string;
    basicAuth?: {
      passwordRef: SecretKeyRef;
      username: string;
    };
    bearerToken?: {
      tokenRef: SecretKeyRef;
    };
    owner: string;
    repo: string;
  };
  bitbucketServer?: {
    api: string;
    basicAuth?: {
      passwordRef: SecretKeyRef;
      username: string;
    };
    bearerToken?: {
      tokenRef: SecretKeyRef;
    };
    caRef?: ConfigMapKeyRef;
    insecure?: boolean;
    project: string;
    repo: string;
  };
  filters?: {
    branchMatch?: string;
    targetBranchMatch?: string;
  }[];
  gitea?: {
    api: string;
    insecure?: boolean;
    labels?: string[];
    owner: string;
    repo: string;
    tokenRef?: SecretKeyRef;
  };
  github?: {
    api?: string;
    appSecretName?: string;
    labels?: string[];
    owner: string;
    repo: string;
    tokenRef?: SecretKeyRef;
  };
  gitlab?: {
    api?: string;
    caRef?: ConfigMapKeyRef;
    insecure?: boolean;
    labels?: string[];
    project: string;
    pullRequestState?: string;
    tokenRef?: SecretKeyRef;
  };
  requeueAfterSeconds?: number;
}

/**
 * Configuration for an SCM provider generator.
 */
export interface ScmProviderGenerator extends GeneratorBase {
  awsCodeCommit?: {
    allBranches?: boolean;
    region?: string;
    role?: string;
    tagFilters?: { key: string; value?: string }[];
  };
  azureDevOps?: {
    accessTokenRef: SecretKeyRef;
    allBranches?: boolean;
    api?: string;
    organization: string;
    teamProject: string;
  };
  bitbucket?: {
    allBranches?: boolean;
    appPasswordRef: SecretKeyRef;
    owner: string;
    user: string;
  };
  bitbucketServer?: {
    allBranches?: boolean;
    api: string;
    basicAuth?: {
      passwordRef: SecretKeyRef;
      username: string;
    };
    bearerToken?: {
      tokenRef: SecretKeyRef;
    };
    caRef?: ConfigMapKeyRef;
    insecure?: boolean;
    project: string;
  };
  cloneProtocol?: "ssh" | "https";
  filters?: {
    branchMatch?: string;
    labelMatch?: string;
    pathsDoNotExist?: string[];
    pathsExist?: string[];
    repositoryMatch?: string;
  }[];
  gitea?: {
    allBranches?: boolean;
    api: string;
    insecure?: boolean;
    owner: string;
    tokenRef?: SecretKeyRef;
  };
  github?: {
    allBranches?: boolean;
    api?: string;
    appSecretName?: string;
    organization: string;
    tokenRef?: SecretKeyRef;
  };
  gitlab?: {
    allBranches?: boolean;
    api?: string;
    caRef?: ConfigMapKeyRef;
    group: string;
    includeSharedProjects?: boolean;
    includeSubgroups?: boolean;
    insecure?: boolean;
    tokenRef?: SecretKeyRef;
    topic?: string;
  };
  requeueAfterSeconds?: number;
}

/**
 * Generator that uses a ClusterDecisionResource custom resource to find clusters.
 */
export interface ClusterDecisionResourceGenerator extends GeneratorBase {
  configMapRef: string;
  labelSelector?: LabelSelector;
  name?: string;
  requeueAfterSeconds?: number;
}

/**
 * Defines a generator to use for discovering applications.
 */
export interface ApplicationSetGenerator {
  clusterDecisionResource?: ClusterDecisionResourceGenerator;
  clusters?: ClusterGenerator;
  git?: GitGenerator;
  list?: ListGenerator;
  matrix?: MatrixGenerator;
  merge?: MergeGenerator;
  plugin?: PluginGenerator;
  pullRequest?: PullRequestGenerator;
  scmProvider?: ScmProviderGenerator;
  selector?: LabelSelector;
}

/**
 * Specification for an ApplicationSet.
 */
export interface ApplicationSetSpec {
  applyNestedSelectors?: boolean;
  generators: ApplicationSetGenerator[];
  goTemplate?: boolean;
  goTemplateOptions?: string[];
  ignoreApplicationDifferences?: {
    jqPathExpressions?: string[];
    jsonPointers?: string[];
    name?: string;
  }[];
  preservedFields?: {
    annotations?: string[];
    labels?: string[];
  };
  strategy?: {
    rollingSync?: {
      steps?: {
        matchExpressions?: {
          key: string;
          operator: string;
          values?: string[];
        }[];
        maxUpdate?: number | string;
      }[];
    };
    type?: string;
  };
  syncPolicy?: {
    applicationsSync?: "create-only" | "create-update" | "create-delete" | "sync";
    preserveResourcesOnDeletion?: boolean;
  };
  /**
   * The template for the applications.
   * {@link ApplicationSetTemplate}
   */
  template: ApplicationSetTemplate;
  templatePatch?: string;
}

/**
 * Represents an ApplicationSet custom resource.
 */
export interface ApplicationSet extends KubernetesObject {
  /**
   * The versioned schema of this representation of an object.
   */
  apiVersion: "argoproj.io/v1alpha1";
  /**
   * The REST resource this object represents.
   */
  kind: "ApplicationSet";
  /**
   * The specification for the ApplicationSet.
   * {@link ApplicationSetSpec}
   */
  spec: ApplicationSetSpec;
}

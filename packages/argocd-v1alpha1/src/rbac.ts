/**
 * Represents a single RBAC rule that allows or denies access to a resource or action in ArgoCD.
 */
export interface RBACRule {
  /**
   * The action that the rule applies to.
   */
  action: "get" | "create" | "update" | "delete" | "sync" | "action" | "override" | "invoke" | "*";

  /**
   * The type of resource that the rule applies to.
   */
  resource:
    | "applications"
    | "applicationsets"
    | "clusters"
    | "projects"
    | "repositories"
    | "accounts"
    | "certificates"
    | "gpgkeys"
    | "logs"
    | "exec"
    | "extensions";

  /**
   * If the rule should match to actions on sub-resources (such as Pods in an application), set this field to the
   * path of the sub-resource. This field MUST begin with a slash (`/`) and may contain glob patterns (`*`). Note
   * that the glob pattern does not stop consuming characters at a slash.
   *
   * See https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/#fine-grained-permissions-for-updatedelete-action
   * for more details.
   */
  subresource?: string;

  /**
   * The object identifier representing the resource on which the action is performed. Depending on the resource,
   * the object's format will vary.
   *
   * For application-related resources, this is either of the format `<app-project>/<app-name>`
   * (e.g. `default/my-app`) for standard installations of ArgoCD, or `<app-project>/<app-ns>/<app-name>` for
   * ArgoCD installations with Applications in any Namespace mode enabled. If you want to match all applications,
   * use `*\/*\/*\/`, otherwise {@link validateRBACRule} will throw an error.
   */
  object: string;

  /**
   * The effect of the rule. If set to `"allow"`, the rule allows the action on the resource. If set to `"deny"`, the
   * rule denies the action on the resource.
   */
  effect: "allow" | "deny";
}

/**
 * Validate a RBAC rule.
 */
export function validateRBACRule(rule: RBACRule, anyNamespaceApps: boolean, context?: string): void {
  // See https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/#application-specific-policy
  const APPLICATION_SPECIFIC = ["applications", "applicationsets", "logs", "exec"];

  if (APPLICATION_SPECIFIC.includes(rule.resource)) {
    const format = anyNamespaceApps ? "<app-project>/<app-ns>/<app-name>" : "<app-project>/<app-name>";
    const pattern = new RegExp(anyNamespaceApps ? "^([^/]+)/([^/]+)/([^/]+)$" : "^([^/]+)/([^/]+)$");
    if (!pattern.test(rule.object)) {
      throw new Error(
        `RBAC rule for resource "${rule.resource}" must have an object in the format "${format}". ` +
          `Got: "${rule.object}", Context: ${context || "unknown"}`,
      );
    }
  }

  if (rule.subresource) {
    if (!rule.subresource.startsWith("/")) {
      throw new Error(
        `RBAC rule for resource "${rule.resource}" must have a subresource that starts with a slash. ` +
          `Got: "${rule.subresource}", Context: ${context || "unknown"}`,
      );
    }
  }
}

/**
 * Generate a policy entry for the RBAC rule.
 */
export function generateRBACPolicyEntry(subject: string, rule: RBACRule): string {
  return `p, ${subject}, ${rule.resource}, ${rule.action}${
    rule.subresource ? rule.subresource : ""
  }, ${rule.object}, ${rule.effect}`;
}

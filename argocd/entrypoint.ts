function expect<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

function arrayEquals<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function formatAllowArg(name: string, values: string[]): string[] {
  if (values.length === 0) {
    return [];
  }
  if (arrayEquals(values, ["*"])) {
    return [`--allow-${name}`];
  }
  return [`--allow-${name}=${values.join(",")}`];
}

/**
 * Type of raw parameters pssed by ArgoCD.
 */
type RawParameters = {
  name: string;
  string?: string;
  array?: string[];
  map?: Record<string, string>;
}[] | null;

/**
 * Parameters for our ArgoCD application.
 */
interface Parameters {
  script: string;
  args: string[];
  deno_allow_all: boolean;
  deno_allow_net: string[];
  deno_allow_read: string[];
  deno_allow_write: string[];
  deno_allow_env: string[];
  deno_allow_run: string[];
  deno_allow_import: string[];
}

/**
 * Parses the `ARGOCD_APP_PARAMETERS` environment variable into our structured format.
 */
export function parseParameters(parameters?: RawParameters): Parameters {
  if (!parameters) {
    parameters = JSON.parse(
      expect(Deno.env.get("ARGOCD_APP_PARAMETERS"), "ARGOCD_APP_PARAMETERS not set"),
    ) as RawParameters;
  }

  if (parameters === null) {
    parameters = [];
  }

  const popBoolean = (name: string): boolean | undefined => {
    const value = popString(name, "boolish string");
    if (value !== undefined) {
      if (value === "true") {
        return true;
      }
      else if (value === "false") {
        return false;
      }
      else {
        throw new Error(`Invalid boolean value for ${name}: ${value}`);
      }
    }
  };

  const popString = (name: string, expected: string = "string"): string | undefined => {
    const index = parameters!.findIndex((p) => p.name === name);
    if (index === -1) {
      return undefined;
    }
    const param = parameters![index];

    // When clearing parameter values in the ArgoCD UI, it may remain behind as an empty string value.
    if (param?.string == "") {
      parameters!.splice(index, 1);
      return undefined;
    }

    if (param?.string) {
      parameters!.splice(index, 1);
      return param.string;
    }

    throw new Error(`Expected ${expected} for ${name}, but found: ${JSON.stringify(param)}`);
  };

  const popArray = (name: string): string[] | undefined => {
    const index = parameters!.findIndex((p) => p.name === name);
    if (index === -1) {
      return undefined;
    }
    const param = parameters![index];
    if (param?.array) {
      parameters!.splice(index, 1);
      return param.array;
    }
    if (param?.string) {
      parameters!.splice(index, 1);
      if (param.string === "") {
        return [];
      }
      return param.string.split(",").map((s) => s.trim()).filter((s) => s !== "");
    }
    throw new Error(`Expected array for ${name}, but found: ${JSON.stringify(param)}`);
  };

  const parsed: Parameters = {
    script: expect(popString("script"), "script parameter is required"),
    args: popArray("args") ?? [],
    deno_allow_all: popBoolean("deno_allow_all") ?? false,
    deno_allow_net: popArray("deno_allow_net") ?? [],
    deno_allow_read: popArray("deno_allow_read") ?? [],
    deno_allow_write: popArray("deno_allow_write") ?? [],
    deno_allow_env: popArray("deno_allow_env") ?? [],
    deno_allow_run: popArray("deno_allow_run") ?? [],
    deno_allow_import: popArray("deno_allow_import") ?? [],
  };

  if (parameters!.length > 0) {
    console.warn("Unrecognized ArgoCD Application parameters:", parameters);
  }

  return parsed;
}

function promoteEnvVar(readName: string, writeName: string): Record<string, string> {
  const value = Deno.env.get(readName);
  if (value !== undefined) {
    console.warn(`Promoting environment variable ${readName} to ${writeName}`);
    return { [writeName]: value };
  }
  return {};
}

async function main() {
  const params = parseParameters();

  // Promote known environment variables.
  const env = {
    ...promoteEnvVar("ARGOCD_ENV_GIN_CACHE_DIR", "GIN_CACHE_DIR"),
  };

  const args = [
    ...(params.deno_allow_all ? ["--allow-all"] : []),
    ...formatAllowArg("net", params.deno_allow_net),
    ...formatAllowArg("read", params.deno_allow_read),
    ...formatAllowArg("write", params.deno_allow_write),
    ...formatAllowArg("env", params.deno_allow_env),
    ...formatAllowArg("run", params.deno_allow_run),
    ...formatAllowArg("import", params.deno_allow_import),
    params.script,
    ...params.args,
  ];

  const result = await new Deno.Command(Deno.execPath(), { args, env }).spawn().output();
  Deno.exit(result.code);
}

if (import.meta.main) {
  await main();
}

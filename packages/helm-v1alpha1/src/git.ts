/**
 * This file implements functions to efficiently manage sparse Git repository checkouts.
 *
 * NOTE: The implementation can probably be improved in many areas, right now it's simply in a "good enough" state.
 */

import { isAbsolute, join } from "@std/path";

/**
 * Helper function to ensure a path is an absolute path.
 */
function abspath(path: string): string {
  if (isAbsolute(path)) {
    return path;
  }
  return join(Deno.cwd(), path);
}

interface RunOptions extends Deno.CommandOptions {
  check?: boolean;
}

/**
 * Helper function to run a command.
 */
export async function run(command: string[], options: RunOptions = {}): Promise<Deno.CommandOutput> {
  if (!command || command.length === 0) {
    throw new Error("Command must be a non-empty array");
  }
  const output = await new Deno.Command(command[0]!, {
    args: command.slice(1),
    ...options,
  }).spawn().output();
  if (options.check && output.code !== 0) {
    const stdoutStr = options.stdout == "piped" ? new TextDecoder().decode(output.stdout) : "";
    const stderrStr = options.stderr == "piped" ? new TextDecoder().decode(output.stderr) : "";
    throw new Error(
      `'${command}' failed with code ${output.code}.\nstdout:\n${stdoutStr}\nstderr:\n${stderrStr}`,
    );
  }
  return output;
}

/**
 * Ensures that a Git bare repository exists at the specified path with the given origin remote. If the repository
 * already exists, and the remote differs, the remote will be updated.
 */
async function reconcileBareRepository({ path, remote }: { path: string; remote: string }) {
  await run(["git", "init", "--bare", path], { check: true, stdout: "piped", stderr: "piped" });

  // HACK: Poor-mans-solution to ensure that the remote is set correctly.
  await run(["git", "-C", path, "remote", "add", "origin", remote], {
    check: false,
    stdout: "piped",
    stderr: "piped",
  });
  await run(["git", "-C", path, "remote", "set-url", "origin", remote], {
    check: false,
    stdout: "piped",
    stderr: "piped",
  });
}

/**
 * Ensure the given Git ref is fetched in the specified bare repository.
 */
async function reconcileFetchTag(
  { repoPath, commitish, tagName }: { repoPath: string; commitish: string; tagName: string },
) {
  await run(["git", "-C", repoPath, "fetch", "origin", commitish, "--depth=1"], {
    check: true,
    stdout: "piped",
    stderr: "piped",
  });
  await run(["git", "-C", repoPath, "tag", tagName, "FETCH_HEAD", "-f"], {
    check: true,
    stdout: "piped",
    stderr: "piped",
  });
}

/**
 * Ensure that a given folder is a Git worktree with the specified commitish checked out from the
 * given local repository.
 *
 * @param targetPath - The path to the folder that should contain the Git worktree.
 * @param repoPath - The path to the local repository of which to create a worktree.
 * @param
 *
 * Note that the function assumes if the worktree already exists, it is in a valid state and
 */
async function reconcileWorktree(
  { worktreePath, repoPath, commitish, checkoutPaths }: {
    worktreePath: string;
    repoPath: string;
    commitish: string;
    checkoutPaths: string[];
  },
): Promise<void> {
  if (!(await Deno.stat(worktreePath).catch(() => false))) {
    await run([
      "git",
      "-C",
      repoPath,
      "worktree",
      "add",
      "--no-checkout",
      "-f",
      abspath(worktreePath),
      commitish,
    ], {
      check: true,
      stdout: "piped",
      stderr: "piped",
    });
  }

  await run(["git", "-C", worktreePath, "reset", commitish, "--", ...checkoutPaths], {
    check: true,
    stdout: "piped",
    stderr: "piped",
  });

  await run(["git", "-C", worktreePath, "checkout", commitish, "--", ...checkoutPaths], {
    check: true,
    stdout: "inherit",
    stderr: "inherit",
  });

  await run(["git", "-C", worktreePath, "clean", "-fdx", "--", ...checkoutPaths], {
    check: true,
    stdout: "piped",
    stderr: "piped",
  });
}

/**
 * This function creates a sparse checkout of a Git repository and ensures that it is in the specified state. For this
 * purpose, it also requires another directory to serve as the bare repository which functions as a kind of cache for
 * subsequent updates to the worktree.
 *
 * Multiple worktrees can be checked out with the same bare repository.
 *
 * The function requires the following Deno permissions:
 *
 * - `--allow-read`
 * - `--allow-run=git`
 *
 * @param worktreePath - The path to the worktree that should be checked out.
 * @param barePath - The path to the bare repository that serves as a cache for the worktree.
 * @param remote - The remote URL of the bare repository.
 * @param commitish - The commitish to check out in the worktree.
 * @param paths - The paths to check out in the worktree. If not specified, the entire repository will be checked out.
 */
export async function reconcileSparseCheckout(
  { worktreePath, barePath, remote, commitish, paths }: {
    worktreePath: string;
    barePath: string;
    remote: string;
    commitish: string;
    paths?: string[];
  },
): Promise<void> {
  console.trace(
    `Reconcile sparse checkout: worktreePath=${worktreePath}, barePath=${barePath}, remote=${remote}, commitish=${commitish}, paths=${
      paths?.join(", ")
    }`,
  );
  await reconcileBareRepository({ path: barePath, remote });
  await reconcileFetchTag({ repoPath: barePath, commitish, tagName: commitish });
  await reconcileWorktree({
    worktreePath: abspath(worktreePath),
    repoPath: abspath(barePath),
    commitish,
    checkoutPaths: paths ?? ["."],
  });
}

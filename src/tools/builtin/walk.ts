import { readdir } from "node:fs/promises";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git"]);

/**
 * Recursively walk `root`, yielding absolute paths of all files.
 * Directories named `node_modules` or `.git` are skipped.
 */
export async function* walkFiles(root: string): AsyncGenerator<string> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkFiles(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/** Compute a forward-slash relative path from `cwd` to `full`. */
export function toRelPosix(cwd: string, full: string): string {
  return path.relative(cwd, full).split(path.sep).join("/");
}

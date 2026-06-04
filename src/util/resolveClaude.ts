import { existsSync } from "fs";
import { delimiter, join } from "path";
import { homedir } from "os";

// Locates the Claude Code CLI binary. Pure (no vscode) so it can be unit tested.
// We never rely on the SDK's bundled native binary (excluded from the package to
// keep it lean), so the extension must always supply an explicit executable path.

export interface ClaudeResolution {
  /** Resolved, existing path to the claude executable. */
  path?: string;
  /** Why resolution failed (mutually exclusive with `path`). */
  error?: "configured-missing" | "not-found";
  /** The configured value, when it was set but did not exist. */
  configuredPath?: string;
}

export function resolveClaudePath(configured: string): ClaudeResolution {
  const trimmed = configured.trim();
  if (trimmed) {
    return existsSync(trimmed)
      ? { path: trimmed }
      : { error: "configured-missing", configuredPath: trimmed };
  }

  const names =
    process.platform === "win32"
      ? ["claude.exe", "claude.cmd", "claude"]
      : ["claude"];

  const dirs = [
    ...(process.env.PATH ?? "").split(delimiter),
    join(homedir(), ".local", "bin"),
    join(homedir(), "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin",
  ];

  for (const dir of dirs) {
    if (!dir) {
      continue;
    }
    for (const name of names) {
      const full = join(dir, name);
      if (existsSync(full)) {
        return { path: full };
      }
    }
  }

  return { error: "not-found" };
}

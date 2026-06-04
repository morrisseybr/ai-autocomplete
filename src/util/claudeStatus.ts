import * as vscode from "vscode";
import { resolveClaudePath } from "./resolveClaude";

const SETTING = "aiAutocomplete.claude.executablePath";
const INSTALL_URL = "https://docs.claude.com/en/docs/claude-code/setup";

// Tracks the last error we notified about so we don't spam the user on every
// keystroke. Reset to undefined once Claude is found again.
let lastNotified: string | undefined;

// Resolves the Claude executable, surfacing a one-time notification (with
// actions) when it cannot be found. Returns the path, or undefined if missing.
export function ensureClaudePath(configured: string): string | undefined {
  const res = resolveClaudePath(configured);
  if (res.path) {
    lastNotified = undefined;
    return res.path;
  }

  const key =
    res.error === "configured-missing"
      ? `configured:${res.configuredPath}`
      : "not-found";
  if (key !== lastNotified) {
    lastNotified = key;
    void notifyMissing(res.error === "configured-missing", res.configuredPath);
  }
  return undefined;
}

async function notifyMissing(
  configuredMissing: boolean,
  configuredPath?: string
): Promise<void> {
  const message = configuredMissing
    ? `AI Autocomplete: the configured Claude path does not exist: ${configuredPath}. Update "${SETTING}".`
    : `AI Autocomplete: the Claude Code CLI ("claude") was not found. Install Claude Code or set "${SETTING}" to its location.`;

  const setPath = "Set path";
  const install = "Install Claude Code";
  const choice = await vscode.window.showErrorMessage(message, setPath, install);
  if (choice === setPath) {
    await vscode.commands.executeCommand("workbench.action.openSettings", SETTING);
  } else if (choice === install) {
    await vscode.env.openExternal(vscode.Uri.parse(INSTALL_URL));
  }
}

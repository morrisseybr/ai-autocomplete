import * as vscode from "vscode";

// Typed view over the aiAutocomplete.* workspace settings.
export interface ExtensionConfig {
  enabled: boolean;
  provider: string;
  claudeModel: string;
  claudeExecutablePath: string;
  claudeDisableThinking: boolean;
  debounceMs: number;
  contextLinesBefore: number;
  contextLinesAfter: number;
  maxOutputTokens: number;
  showLoadingIndicator: boolean;
}

export function readConfig(): ExtensionConfig {
  const c = vscode.workspace.getConfiguration("aiAutocomplete");
  return {
    enabled: c.get<boolean>("enabled", true),
    provider: c.get<string>("provider", "claude"),
    claudeModel: c.get<string>("claude.model", "claude-haiku-4-5-20251001"),
    claudeExecutablePath: c.get<string>("claude.executablePath", ""),
    claudeDisableThinking: c.get<boolean>("claude.disableThinking", true),
    debounceMs: c.get<number>("debounceMs", 600),
    contextLinesBefore: c.get<number>("contextLinesBefore", 100),
    contextLinesAfter: c.get<number>("contextLinesAfter", 50),
    maxOutputTokens: c.get<number>("maxOutputTokens", 256),
    showLoadingIndicator: c.get<boolean>("showLoadingIndicator", true),
  };
}

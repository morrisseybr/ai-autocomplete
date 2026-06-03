import * as vscode from "vscode";

// Typed view over the aiAutocomplete.* workspace settings.
export interface ExtensionConfig {
  enabled: boolean;
  provider: string;
  claudeModel: string;
  debounceMs: number;
  contextLinesBefore: number;
  contextLinesAfter: number;
  maxOutputTokens: number;
}

export function readConfig(): ExtensionConfig {
  const c = vscode.workspace.getConfiguration("aiAutocomplete");
  return {
    enabled: c.get<boolean>("enabled", true),
    provider: c.get<string>("provider", "claude"),
    claudeModel: c.get<string>("claude.model", "claude-haiku-4-5-20251001"),
    debounceMs: c.get<number>("debounceMs", 600),
    contextLinesBefore: c.get<number>("contextLinesBefore", 50),
    contextLinesAfter: c.get<number>("contextLinesAfter", 30),
    maxOutputTokens: c.get<number>("maxOutputTokens", 256),
  };
}

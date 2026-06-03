import * as vscode from "vscode";

// Single shared OutputChannel ("AI Autocomplete") for diagnostics.
let channel: vscode.OutputChannel | undefined;

export function initLogger(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel("AI Autocomplete");
  }
  return channel;
}

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export function log(message: string): void {
  channel?.appendLine(`[${ts()}] ${message}`);
}

export function logError(message: string, err: unknown): void {
  const detail = err instanceof Error ? err.stack ?? err.message : String(err);
  channel?.appendLine(`[${ts()}] ERROR ${message}: ${detail}`);
}

export function disposeLogger(): void {
  channel?.dispose();
  channel = undefined;
}

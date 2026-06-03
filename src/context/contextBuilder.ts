import * as vscode from "vscode";
import type { ExtensionConfig } from "../config";

export interface EditorContext {
  languageId: string;
  filePath: string;
  prefix: string;
  suffix: string;
  openFiles: string[];
  workspaceRoot?: string;
}

// Extracts the lean context the provider needs from the current editor state.
export function buildContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  config: ExtensionConfig
): EditorContext {
  const cursorOffset = document.offsetAt(position);
  const fullText = document.getText();
  const before = fullText.slice(0, cursorOffset);
  const after = fullText.slice(cursorOffset);

  const prefix = lastLines(before, config.contextLinesBefore);
  const suffix = firstLines(after, config.contextLinesAfter);

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const filePath = vscode.workspace.asRelativePath(document.uri, false);

  return {
    languageId: document.languageId,
    filePath,
    prefix,
    suffix,
    openFiles: collectOpenFilePaths(document.uri),
    workspaceRoot: workspaceFolder?.uri.fsPath,
  };
}

function lastLines(text: string, n: number): string {
  if (n <= 0) {
    return "";
  }
  const lines = text.split("\n");
  return lines.slice(Math.max(0, lines.length - n)).join("\n");
}

function firstLines(text: string, n: number): string {
  if (n <= 0) {
    return "";
  }
  const lines = text.split("\n");
  return lines.slice(0, n).join("\n");
}

// Paths of other open tabs (no contents, to keep the request lean).
function collectOpenFilePaths(activeUri: vscode.Uri): string[] {
  const paths = new Set<string>();
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      if (input instanceof vscode.TabInputText) {
        if (input.uri.toString() === activeUri.toString()) {
          continue;
        }
        if (input.uri.scheme !== "file") {
          continue;
        }
        paths.add(vscode.workspace.asRelativePath(input.uri, false));
      }
    }
  }
  return [...paths];
}

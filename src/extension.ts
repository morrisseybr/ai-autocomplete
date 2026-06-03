import * as vscode from "vscode";
import { AiInlineCompletionProvider } from "./inlineProvider";
import { disposeLogger, initLogger, log } from "./util/logger";

export function activate(context: vscode.ExtensionContext): void {
  initLogger();
  log("AI Autocomplete activated");

  const inlineProvider = new AiInlineCompletionProvider();
  const registration = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    inlineProvider
  );

  const toggle = vscode.commands.registerCommand(
    "aiAutocomplete.toggle",
    async () => {
      const cfg = vscode.workspace.getConfiguration("aiAutocomplete");
      const next = !cfg.get<boolean>("enabled", true);
      await cfg.update(
        "enabled",
        next,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.setStatusBarMessage(
        `AI Autocomplete ${next ? "enabled" : "disabled"}`,
        2000
      );
      log(`toggled enabled -> ${next}`);
    }
  );

  const trigger = vscode.commands.registerCommand(
    "aiAutocomplete.trigger",
    async () => {
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger"
      );
    }
  );

  context.subscriptions.push(registration, toggle, trigger);
}

export function deactivate(): void {
  disposeLogger();
}

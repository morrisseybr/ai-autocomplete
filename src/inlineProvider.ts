import * as vscode from "vscode";
import { readConfig } from "./config";
import { buildContext } from "./context/contextBuilder";
import { createProvider } from "./providers/registry";
import type { CompletionProvider } from "./providers/types";
import { log, logError } from "./util/logger";

// Bridges VSCode's inline completion lifecycle to an AI CompletionProvider.
// VSCode natively renders the result as muted ghost text; Tab accepts, Esc and
// further typing dismiss it (each keystroke cancels the previous token and
// re-invokes this provider).
export class AiInlineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private provider: CompletionProvider;
  private providerKey: string;

  constructor() {
    const cfg = readConfig();
    this.providerKey = `${cfg.provider}:${cfg.claudeModel}`;
    this.provider = createProvider({
      provider: cfg.provider,
      claudeModel: cfg.claudeModel,
      onLog: log,
    });
  }

  // Rebuild the underlying provider if provider/model settings changed.
  private ensureProvider(provider: string, claudeModel: string): void {
    const key = `${provider}:${claudeModel}`;
    if (key !== this.providerKey) {
      this.providerKey = key;
      this.provider = createProvider({ provider, claudeModel, onLog: log });
    }
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    const cfg = readConfig();
    if (!cfg.enabled) {
      return undefined;
    }
    this.ensureProvider(cfg.provider, cfg.claudeModel);

    // Debounce: wait until the user pauses. A keystroke cancels this token,
    // so we bail out before spending an API call.
    const isManual =
      context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke;
    if (!isManual) {
      const interrupted = await delay(cfg.debounceMs, token);
      if (interrupted || token.isCancellationRequested) {
        return undefined;
      }
    }

    const ctx = buildContext(document, position, cfg);

    // Bridge the VSCode token to an AbortSignal so we can kill the subprocess.
    const controller = new AbortController();
    const sub = token.onCancellationRequested(() => controller.abort());

    try {
      const result = await this.provider.complete({
        languageId: ctx.languageId,
        filePath: ctx.filePath,
        prefix: ctx.prefix,
        suffix: ctx.suffix,
        openFiles: ctx.openFiles,
        workspaceRoot: ctx.workspaceRoot,
        maxOutputTokens: cfg.maxOutputTokens,
        signal: controller.signal,
      });

      if (token.isCancellationRequested || !result.text) {
        return undefined;
      }

      const item = new vscode.InlineCompletionItem(
        result.text,
        new vscode.Range(position, position)
      );
      return [item];
    } catch (err) {
      logError("inline completion failed", err);
      return undefined;
    } finally {
      sub.dispose();
    }
  }
}

// Resolves true if the token was cancelled before the delay elapsed.
function delay(ms: number, token: vscode.CancellationToken): Promise<boolean> {
  if (ms <= 0) {
    return Promise.resolve(token.isCancellationRequested);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sub.dispose();
      resolve(false);
    }, ms);
    const sub = token.onCancellationRequested(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

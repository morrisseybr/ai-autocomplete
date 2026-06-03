import * as vscode from "vscode";
import { readConfig, type ExtensionConfig } from "./config";
import { buildContext } from "./context/contextBuilder";
import { createProvider } from "./providers/registry";
import type { CompletionProvider } from "./providers/types";
import { LoadingIndicator } from "./util/loadingIndicator";
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

  constructor(private readonly loading: LoadingIndicator) {
    const cfg = readConfig();
    this.providerKey = providerKeyFor(cfg);
    this.provider = createProvider({
      provider: cfg.provider,
      claudeModel: cfg.claudeModel,
      claudeDisableThinking: cfg.claudeDisableThinking,
      onLog: log,
    });
  }

  // Rebuild the underlying provider if any provider-affecting setting changed.
  private ensureProvider(cfg: ExtensionConfig): void {
    const key = providerKeyFor(cfg);
    if (key !== this.providerKey) {
      this.providerKey = key;
      this.provider = createProvider({
        provider: cfg.provider,
        claudeModel: cfg.claudeModel,
        claudeDisableThinking: cfg.claudeDisableThinking,
        onLog: log,
      });
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
    this.ensureProvider(cfg);

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

    // Show the loading spinner now that the real request is about to fire (only
    // after the debounce, never during it). Stop it the moment the user types.
    let gen: number | undefined;
    if (cfg.showLoadingIndicator) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document === document) {
        gen = this.loading.start(editor, position);
      }
    }

    // Bridge the VSCode token to an AbortSignal so we can kill the subprocess.
    const controller = new AbortController();
    const sub = token.onCancellationRequested(() => {
      controller.abort();
      this.loading.stop(gen);
    });

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
      this.loading.stop(gen);
      sub.dispose();
    }
  }
}

// Key identifying the provider-affecting settings; changing any rebuilds it.
function providerKeyFor(cfg: ExtensionConfig): string {
  return `${cfg.provider}:${cfg.claudeModel}:${cfg.claudeDisableThinking}`;
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

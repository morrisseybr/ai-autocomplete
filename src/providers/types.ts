// Provider abstraction so multiple AI backends (Claude today; Gemini, Codex, ...
// later) can be swapped behind a single interface.

export interface CompletionRequest {
  /** VSCode language id of the active document (e.g. "typescript"). */
  languageId: string;
  /** Path of the active file, relative to the workspace when possible. */
  filePath: string;
  /** Source code immediately before the cursor (bounded by config). */
  prefix: string;
  /** Source code immediately after the cursor (bounded by config). */
  suffix: string;
  /** Paths of other open tabs, for lightweight cross-file context. */
  openFiles: string[];
  /** Workspace root, used as cwd so the provider can discover project context. */
  workspaceRoot?: string;
  /** Upper bound on tokens the provider should generate. */
  maxOutputTokens: number;
  /** Aborts the in-flight request when the user keeps typing or cancels. */
  signal: AbortSignal;
}

export interface CompletionResult {
  /** Text to insert at the cursor. Empty string means "no suggestion". */
  text: string;
}

export interface CompletionProvider {
  readonly id: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

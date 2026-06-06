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
  /**
   * Outcome of the request, for benchmarking/diagnostics. Production consumers
   * only read `text`; these are optional metrics the test harness relies on to
   * tell a legitimate "no suggestion" apart from an error or a timeout.
   * - "ok": a non-empty completion was produced.
   * - "empty": the model intentionally returned nothing (NO_COMPLETION / blank).
   * - "error": the provider failed (e.g. auth, subprocess crash).
   * - "aborted": the request was cancelled or timed out.
   */
  status?: "ok" | "empty" | "error" | "aborted";
  /** Wall-clock latency of the provider call, in milliseconds. */
  latencyMs?: number;
  /** Token usage reported by the model, when available. */
  usage?: { inputTokens?: number; outputTokens?: number };
  /** Cost of the request in USD, as reported by the SDK. */
  costUsd?: number;
}

export interface CompletionProvider {
  readonly id: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

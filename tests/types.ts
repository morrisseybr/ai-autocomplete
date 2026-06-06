// Shared types for the autocomplete test/benchmark harness. These run headless
// (no VSCode) by driving ClaudeAgentProvider directly, the same seam scripts/
// smoke.ts uses.

export type Category =
  | "simple"
  | "fim"
  | "no-completion"
  | "multi-lang"
  | "edge"
  | "context";

// How a case's output is judged. Evaluation is fully deterministic (no LLM
// judge): regex/predicate matchers plus a universal "clean output" check that
// every non-empty result must pass (see matchers.ts).
export type Expectation =
  // The model should return no suggestion at all.
  | { kind: "empty" }
  // Any non-empty, clean suggestion is acceptable (used for genuinely ambiguous
  // cases where we can only assert "produced plausible, clean code").
  | { kind: "nonEmpty" }
  | { kind: "match"; pattern: RegExp }
  | { kind: "notMatch"; pattern: RegExp }
  | { kind: "contains"; value: string }
  | { kind: "notContains"; value: string }
  | { kind: "predicate"; label: string; fn: (text: string, c: TestCase) => boolean }
  // Composite: all sub-expectations must hold.
  | { kind: "all"; of: Expectation[] };

export interface TestCase {
  /** Stable unique id, e.g. "simple-fibonacci". */
  id: string;
  /** Human-readable description of what is being checked. */
  description: string;
  category: Category;
  /** VSCode-style language id, e.g. "python", "typescript". */
  languageId: string;
  filePath: string;
  /** Code before the caret. */
  prefix: string;
  /** Code after the caret (empty for end-of-file cases). */
  suffix: string;
  /** Optional other open tabs, for lightweight cross-file context. */
  openFiles?: string[];
  expect: Expectation;
  /** Free-form tags for subset selection, e.g. ["smoke"]. */
  tags?: string[];
}

// Everything needed to instantiate a provider for one run.
export interface ProviderRunConfig {
  /** Short label used in reports, e.g. "haiku/think-off/256". */
  label: string;
  model: string;
  disableThinking: boolean;
  maxOutputTokens: number;
  /** Resolved path to the claude binary (auto-detected when omitted). */
  executablePath?: string;
}

// Outcome of running one case once under one config.
export interface CaseResult {
  caseId: string;
  category: Category;
  pass: boolean;
  /** Why it passed/failed (matcher label or failure reason). */
  reason: string;
  latencyMs: number;
  status: "ok" | "empty" | "error" | "aborted" | "timeout";
  /** Raw cleaned completion text (truncated for reports). */
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  costUsd?: number;
}

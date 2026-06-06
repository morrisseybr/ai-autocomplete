// Core execution: run one case once under one provider config, measuring
// latency and judging the output deterministically.

import { ClaudeAgentProvider } from "../src/providers/claudeAgentProvider";
import { resolveClaudePath } from "../src/util/resolveClaude";
import { judge } from "./matchers";
import type { CaseResult, ProviderRunConfig, TestCase } from "./types";

export interface RunOpts {
  /** Hard cap per request; on expiry the call is aborted and marked "timeout". */
  timeoutMs?: number;
  /** Forwarded as cwd so the provider can discover project context. */
  workspaceRoot?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;

// Resolve the claude binary once; reused across every run. Honors an explicit
// path from config or the AI_AC_CLAUDE_PATH env, else auto-detects.
let resolvedPath: string | undefined | null = null;
function claudePath(configured?: string): string | undefined {
  if (configured) {
    return configured;
  }
  if (resolvedPath === null) {
    const r = resolveClaudePath(process.env.AI_AC_CLAUDE_PATH ?? "");
    resolvedPath = r.path;
    if (!r.path) {
      console.warn(
        `[runner] could not resolve a claude binary (${r.error}); the SDK's bundled binary will be used if present.`
      );
    }
  }
  return resolvedPath ?? undefined;
}

export async function runCase(
  cfg: ProviderRunConfig,
  c: TestCase,
  opts: RunOpts = {}
): Promise<CaseResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const provider = new ClaudeAgentProvider({
    model: cfg.model,
    disableThinking: cfg.disableThinking,
    executablePath: claudePath(cfg.executablePath),
  });

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const started = Date.now();
  const base = {
    caseId: c.id,
    category: c.category,
    usage: undefined as CaseResult["usage"],
    costUsd: undefined as number | undefined,
  };

  try {
    const result = await provider.complete({
      languageId: c.languageId,
      filePath: c.filePath,
      prefix: c.prefix,
      suffix: c.suffix,
      openFiles: c.openFiles ?? [],
      workspaceRoot: opts.workspaceRoot,
      maxOutputTokens: cfg.maxOutputTokens,
      signal: controller.signal,
    });

    const latencyMs = result.latencyMs ?? Date.now() - started;
    base.usage = result.usage;
    base.costUsd = result.costUsd;

    if (timedOut) {
      return { ...base, pass: false, reason: `timed out after ${timeoutMs}ms`, latencyMs, status: "timeout", text: "" };
    }
    if (result.status === "error") {
      return { ...base, pass: false, reason: "provider error", latencyMs, status: "error", text: "" };
    }

    const verdict = judge(c, result.text);
    return {
      ...base,
      pass: verdict.pass,
      reason: verdict.reason,
      latencyMs,
      status: result.status ?? (result.text ? "ok" : "empty"),
      text: result.text,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    if (timedOut) {
      return { ...base, pass: false, reason: `timed out after ${timeoutMs}ms`, latencyMs, status: "timeout", text: "" };
    }
    return {
      ...base,
      pass: false,
      reason: `threw: ${err instanceof Error ? err.message : String(err)}`,
      latencyMs,
      status: "error",
      text: "",
    };
  } finally {
    clearTimeout(timer);
  }
}

// Runs `fn` over `items` with at most `concurrency` in flight, preserving the
// input order in the returned array. Keeps API pressure bounded for big matrices.
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) {
        return;
      }
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

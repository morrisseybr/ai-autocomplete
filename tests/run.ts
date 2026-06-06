// Single-config regression run (Objetivo 1). Runs the catalog once under one
// config and prints a pass/fail table, exiting non-zero if anything fails.
//
//   npm test                         # full catalog, default config
//   npm test -- --category simple    # one category
//   npm test -- --tag smoke          # the migrated smoke subset
//   npm test -- --id simple-add-return --grep fib
//   AI_AC_MODEL=claude-sonnet-4-6 npm test
//
// Config defaults mirror the extension defaults and can be overridden by env
// (AI_AC_MODEL, AI_AC_THINKING=on|off, AI_AC_MAX_TOKENS) or flags.

import { parseArgs } from "./args";
import { selectCases } from "./cases";
import { mapPool, runCase } from "./runner";
import type { Category, CaseResult, ProviderRunConfig } from "./types";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const cases = selectCases({
    categories: args.getList("category") as Category[],
    ids: args.getList("id"),
    tag: args.get("tag"),
    grep: args.get("grep"),
    quick: args.has("quick"),
  });

  if (cases.length === 0) {
    console.error("No cases matched the given filters.");
    process.exit(2);
  }

  const config: ProviderRunConfig = {
    label: "run",
    model: args.get("model") ?? process.env.AI_AC_MODEL ?? "claude-haiku-4-5-20251001",
    disableThinking:
      args.has("thinking") ? args.get("thinking") !== "on" : process.env.AI_AC_THINKING !== "on",
    maxOutputTokens: args.getNumber("max-tokens", Number(process.env.AI_AC_MAX_TOKENS) || 256),
  };
  const reps = args.getNumber("reps", 1);
  const concurrency = args.getNumber("concurrency", 4);
  const timeoutMs = args.getNumber("timeout", 30_000);

  console.log(
    `Running ${cases.length} case(s) × ${reps} rep(s) — model=${config.model} ` +
      `thinking=${config.disableThinking ? "off" : "on"} maxTokens=${config.maxOutputTokens} concurrency=${concurrency}\n`
  );

  const jobs = cases.flatMap((c) => Array.from({ length: reps }, () => c));
  const results = await mapPool(jobs, concurrency, (c) => runCase(config, c, { timeoutMs }));

  // Group reps by case and report pass count.
  const byCase = new Map<string, CaseResult[]>();
  for (const r of results) {
    const arr = byCase.get(r.caseId) ?? [];
    arr.push(r);
    byCase.set(r.caseId, arr);
  }

  let failed = 0;
  for (const c of cases) {
    const runs = byCase.get(c.id) ?? [];
    const ok = runs.filter((r) => r.pass).length;
    const allPass = ok === runs.length;
    if (!allPass) {
      failed++;
    }
    const avgMs = Math.round(runs.reduce((a, r) => a + r.latencyMs, 0) / Math.max(1, runs.length));
    const icon = allPass ? "PASS" : "FAIL";
    console.log(`${icon}  ${c.id.padEnd(26)} ${ok}/${runs.length}  ${String(avgMs).padStart(6)}ms  ${c.category}`);
    if (!allPass) {
      const firstFail = runs.find((r) => !r.pass);
      console.log(`        ↳ ${firstFail?.reason}`);
    }
  }

  const total = cases.length;
  console.log(`\n${total - failed}/${total} cases passed${failed ? ` — ${failed} FAILED` : ""}.`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

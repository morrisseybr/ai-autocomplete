// Benchmark across a config matrix (Objetivo 2). Runs the catalog under every
// model × thinking × maxTokens combination, then reports pass rate and latency
// per config and per case, writing markdown + JSON to bench-results/.
//
//   npm run bench                                  # full matrix (slow/costly)
//   npm run bench -- --models haiku --reps 1 --quick
//   npm run bench -- --models haiku,sonnet --max-tokens 64,256 --categories simple,fim
//   npm run bench -- --no-thinking-off            # only thinking-on variants
//
// Cost warning: the full matrix is (models × thinking × maxTokens) configs, each
// running every case `reps` times. Trim with the flags above.

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parseArgs } from "./args";
import { selectCases } from "./cases";
import { aggregate, comparisonTable, markdownReport, perCaseTable } from "./report";
import { mapPool, runCase } from "./runner";
import type { Category, ProviderRunConfig } from "./types";

// Friendly aliases → full model ids for the --models flag.
const MODEL_ALIASES: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const modelKeys = args.getList("models");
  const models = (modelKeys.length ? modelKeys : ["haiku", "sonnet", "opus"]).map(
    (m) => ({ key: m, id: MODEL_ALIASES[m] ?? m })
  );

  // Thinking axis: both by default; trim with --no-thinking-on/--no-thinking-off.
  const thinkingModes: boolean[] = []; // disableThinking values
  if (!args.has("no-thinking-off")) thinkingModes.push(true); // thinking off
  if (!args.has("no-thinking-on")) thinkingModes.push(false); // thinking on
  if (thinkingModes.length === 0) thinkingModes.push(true);

  const tokenAxis = args.getList("max-tokens").map(Number).filter((n) => n > 0);
  const maxTokensList = tokenAxis.length ? tokenAxis : [64, 256];

  const reps = args.getNumber("reps", 3);
  const concurrency = args.getNumber("concurrency", 4);
  const timeoutMs = args.getNumber("timeout", 45_000);

  const cases = selectCases({
    categories: args.getList("categories") as Category[],
    tag: args.get("tag"),
    quick: args.has("quick"),
  });
  if (cases.length === 0) {
    console.error("No cases matched the given filters.");
    process.exit(2);
  }

  // Build the cartesian config matrix.
  const configs: ProviderRunConfig[] = [];
  for (const m of models) {
    for (const disableThinking of thinkingModes) {
      for (const maxOutputTokens of maxTokensList) {
        configs.push({
          label: `${m.key}/think-${disableThinking ? "off" : "on"}/${maxOutputTokens}`,
          model: m.id,
          disableThinking,
          maxOutputTokens,
        });
      }
    }
  }

  const totalRuns = configs.length * cases.length * reps;
  console.log(
    `Benchmark matrix: ${configs.length} config(s) × ${cases.length} case(s) × ${reps} rep(s) = ${totalRuns} requests.`
  );
  console.log(`Configs: ${configs.map((c) => c.label).join(", ")}`);
  console.log(`This makes ${totalRuns} real API calls and costs tokens. Ctrl-C to abort.\n`);

  const aggs = [];
  for (const config of configs) {
    process.stdout.write(`→ ${config.label} ... `);
    const jobs = cases.flatMap((c) => Array.from({ length: reps }, () => c));
    const started = Date.now();
    const results = await mapPool(jobs, concurrency, (c) => runCase(config, c, { timeoutMs }));
    const agg = aggregate(config, results);
    aggs.push(agg);
    console.log(
      `${(agg.passRate * 100).toFixed(0)}% pass, p50 ${agg.latency.p50}ms (${Math.round((Date.now() - started) / 1000)}s)`
    );
  }

  console.log(`\n=== Config comparison ===\n`);
  console.log(comparisonTable(aggs));
  console.log(`\n=== Per-case pass rate ===\n`);
  console.log(perCaseTable(aggs));

  // Persist reports.
  const dir = join(process.cwd(), "bench-results");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const meta = {
    timestamp: new Date().toISOString(),
    cases: String(cases.length),
    reps: String(reps),
    configs: String(configs.length),
  };
  const mdPath = join(dir, `bench-${stamp}.md`);
  const jsonPath = join(dir, `bench-${stamp}.json`);
  writeFileSync(mdPath, markdownReport(aggs, meta), "utf8");
  writeFileSync(
    jsonPath,
    JSON.stringify(
      { meta, configs: aggs.map((a) => ({ config: a.config, total: a.total, passed: a.passed, passRate: a.passRate, latency: a.latency, totalCostUsd: a.totalCostUsd, results: a.results })) },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\nWrote ${mdPath}\n      ${jsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

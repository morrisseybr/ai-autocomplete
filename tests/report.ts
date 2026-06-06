// Aggregation and formatting of run results into console tables, a markdown
// report, and a JSON dump for the benchmark.

import type { CaseResult, ProviderRunConfig } from "./types";

export interface ConfigAggregate {
  config: ProviderRunConfig;
  total: number;
  passed: number;
  passRate: number;
  latency: LatencyStats;
  totalCostUsd: number;
  results: CaseResult[];
}

export interface LatencyStats {
  p50: number;
  p95: number;
  avg: number;
  min: number;
  max: number;
}

export function latencyStats(values: number[]): LatencyStats {
  if (values.length === 0) {
    return { p50: 0, p95: 0, avg: 0, min: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    p50: pct(50),
    p95: pct(95),
    avg: Math.round(sum / sorted.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

export function aggregate(config: ProviderRunConfig, results: CaseResult[]): ConfigAggregate {
  const passed = results.filter((r) => r.pass).length;
  return {
    config,
    total: results.length,
    passed,
    passRate: results.length ? passed / results.length : 0,
    latency: latencyStats(results.map((r) => r.latencyMs)),
    totalCostUsd: results.reduce((a, r) => a + (r.costUsd ?? 0), 0),
    results,
  };
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

// One-line-per-config comparison, sorted by pass rate then latency.
export function comparisonTable(aggs: ConfigAggregate[]): string {
  const rows = [...aggs].sort((a, b) => b.passRate - a.passRate || a.latency.p50 - b.latency.p50);
  const header = ["config", "pass", "rate", "p50 ms", "p95 ms", "avg ms", "cost $"];
  const body = rows.map((a) => [
    a.config.label,
    `${a.passed}/${a.total}`,
    pct(a.passRate),
    String(a.latency.p50),
    String(a.latency.p95),
    String(a.latency.avg),
    a.totalCostUsd.toFixed(4),
  ]);
  return asciiTable(header, body);
}

// Per-case pass rate across configs, to surface hard/flaky cases.
export function perCaseTable(aggs: ConfigAggregate[]): string {
  const ids = [...new Set(aggs.flatMap((a) => a.results.map((r) => r.caseId)))];
  const header = ["case", ...aggs.map((a) => a.config.label)];
  const body = ids.map((id) => {
    const cells = aggs.map((a) => {
      const runs = a.results.filter((r) => r.caseId === id);
      const ok = runs.filter((r) => r.pass).length;
      return runs.length ? `${ok}/${runs.length}` : "-";
    });
    return [id, ...cells];
  });
  return asciiTable(header, body);
}

export function markdownReport(aggs: ConfigAggregate[], meta: Record<string, string>): string {
  const lines: string[] = [];
  lines.push(`# Autocomplete benchmark`);
  lines.push("");
  for (const [k, v] of Object.entries(meta)) {
    lines.push(`- **${k}**: ${v}`);
  }
  lines.push("");
  lines.push(`## Config comparison`);
  lines.push("");
  lines.push(mdTable(["config", "pass", "rate", "p50 ms", "p95 ms", "avg ms", "cost $"],
    [...aggs].sort((a, b) => b.passRate - a.passRate || a.latency.p50 - b.latency.p50).map((a) => [
      a.config.label, `${a.passed}/${a.total}`, pct(a.passRate),
      String(a.latency.p50), String(a.latency.p95), String(a.latency.avg), a.totalCostUsd.toFixed(4),
    ])));
  lines.push("");
  lines.push(`## Per-case pass rate`);
  lines.push("");
  const ids = [...new Set(aggs.flatMap((a) => a.results.map((r) => r.caseId)))];
  lines.push(mdTable(["case", ...aggs.map((a) => a.config.label)],
    ids.map((id) => [id, ...aggs.map((a) => {
      const runs = a.results.filter((r) => r.caseId === id);
      const ok = runs.filter((r) => r.pass).length;
      return runs.length ? `${ok}/${runs.length}` : "-";
    })])));
  lines.push("");
  return lines.join("\n");
}

function mdTable(header: string[], rows: string[][]): string {
  const out = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
  for (const r of rows) {
    out.push(`| ${r.join(" | ")} |`);
  }
  return out.join("\n");
}

function asciiTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const fmt = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ");
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  return [fmt(header), sep, ...rows.map(fmt)].join("\n");
}

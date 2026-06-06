// Aggregated test-case catalog + selection helpers shared by run.ts and bench.ts.

import type { Category, TestCase } from "../types";
import { simpleCases } from "./simple";
import { fimCases } from "./fim";
import { noCompletionCases } from "./no-completion";
import { multiLangCases } from "./multi-lang";
import { edgeCases } from "./edge";
import { contextCases } from "./context";

export const allCases: TestCase[] = [
  ...simpleCases,
  ...fimCases,
  ...noCompletionCases,
  ...multiLangCases,
  ...edgeCases,
  ...contextCases,
];

// A small, fast, high-signal subset for quick runs (`--quick`).
const QUICK_IDS = new Set([
  "simple-add-return",
  "simple-fibonacci",
  "fim-template-literal",
  "nocomp-complete-function",
  "edge-partial-import",
]);

export interface CaseFilter {
  categories?: Category[];
  ids?: string[];
  tag?: string;
  grep?: string;
  quick?: boolean;
}

export function selectCases(filter: CaseFilter = {}): TestCase[] {
  let cases = allCases;
  if (filter.quick) {
    cases = cases.filter((c) => QUICK_IDS.has(c.id));
  }
  if (filter.categories?.length) {
    const set = new Set(filter.categories);
    cases = cases.filter((c) => set.has(c.category));
  }
  if (filter.ids?.length) {
    const set = new Set(filter.ids);
    cases = cases.filter((c) => set.has(c.id));
  }
  if (filter.tag) {
    cases = cases.filter((c) => c.tags?.includes(filter.tag!));
  }
  if (filter.grep) {
    const re = new RegExp(filter.grep, "i");
    cases = cases.filter((c) => re.test(c.id) || re.test(c.description));
  }
  return cases;
}

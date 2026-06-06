// Deterministic evaluation of a completion against a case's expectation, plus a
// universal "clean output" check applied to every non-empty result.

import { NO_COMPLETION } from "../src/util/cleanCompletion";
import type { Expectation, TestCase } from "./types";

export interface Verdict {
  pass: boolean;
  reason: string;
}

// Slop the model must never emit in a raw inline completion. Centralized here so
// the harness and the provider's own regression test agree on the definition.
// (cleanCompletion() should already strip most of this; a leak is a real bug.)
const SLOP = /```|\bNO_COMPLETION\b|^\s*(?:I['’]ll\b|I will\b|Here(?:'s| is)\b|Let me\b|Sure[,.! ]|Based on\b|Looking at\b)/im;

// Checks that apply to ANY non-empty suggestion regardless of the case's own
// expectation. A case only passes if both this and its specific matcher pass.
export function universalCheck(text: string, c: TestCase): Verdict {
  if (SLOP.test(text)) {
    return { pass: false, reason: `universal: output contains prose/fence/sentinel slop` };
  }
  if (text.includes(NO_COMPLETION)) {
    return { pass: false, reason: `universal: leaked ${NO_COMPLETION}` };
  }
  // The suggestion must not re-type the tail of what the user already wrote.
  const tail = c.prefix.slice(-40).trimEnd();
  if (tail.length >= 8 && text.startsWith(tail)) {
    return { pass: false, reason: `universal: duplicates prefix tail` };
  }
  return { pass: true, reason: "" };
}

export function evaluate(expect: Expectation, text: string, c: TestCase): Verdict {
  switch (expect.kind) {
    case "empty":
      return text === ""
        ? { pass: true, reason: "empty as expected" }
        : { pass: false, reason: `expected no suggestion, got ${preview(text)}` };

    case "nonEmpty":
      return text !== ""
        ? { pass: true, reason: "non-empty as expected" }
        : { pass: false, reason: "expected a suggestion, got none" };

    case "match":
      return expect.pattern.test(text)
        ? { pass: true, reason: `matched ${expect.pattern}` }
        : { pass: false, reason: `expected match ${expect.pattern}, got ${preview(text)}` };

    case "notMatch":
      return !expect.pattern.test(text)
        ? { pass: true, reason: `did not match ${expect.pattern}` }
        : { pass: false, reason: `unexpected match ${expect.pattern} in ${preview(text)}` };

    case "contains":
      return text.includes(expect.value)
        ? { pass: true, reason: `contains "${expect.value}"` }
        : { pass: false, reason: `expected to contain "${expect.value}", got ${preview(text)}` };

    case "notContains":
      return !text.includes(expect.value)
        ? { pass: true, reason: `does not contain "${expect.value}"` }
        : { pass: false, reason: `unexpected "${expect.value}" in ${preview(text)}` };

    case "predicate":
      return expect.fn(text, c)
        ? { pass: true, reason: `predicate "${expect.label}" held` }
        : { pass: false, reason: `predicate "${expect.label}" failed for ${preview(text)}` };

    case "all": {
      for (const sub of expect.of) {
        const v = evaluate(sub, text, c);
        if (!v.pass) {
          return v;
        }
      }
      return { pass: true, reason: "all sub-expectations held" };
    }
  }
}

// Full judgement for a case: the specific matcher AND (for non-empty results)
// the universal clean-output check.
export function judge(c: TestCase, text: string): Verdict {
  const specific = evaluate(c.expect, text, c);
  if (!specific.pass) {
    return specific;
  }
  if (text !== "") {
    const uni = universalCheck(text, c);
    if (!uni.pass) {
      return uni;
    }
  }
  return specific;
}

function preview(text: string): string {
  const oneLine = text.replace(/\n/g, "\\n");
  return JSON.stringify(oneLine.length > 80 ? oneLine.slice(0, 80) + "…" : oneLine);
}

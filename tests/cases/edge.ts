// Edge cases and adversarial inputs. For genuinely ambiguous prompts we can't
// assert exact content, so we use `clean` (always passes the specific matcher;
// the universal clean-output check still runs on any non-empty result) — i.e.
// "must not crash and must not emit slop, whatever it decides to suggest".

import type { Expectation, TestCase } from "../types";

const clean: Expectation = { kind: "predicate", label: "clean-or-empty", fn: () => true };

// A long but mundane prefix, to exercise large-context handling.
const longPrefix =
  Array.from({ length: 60 }, (_, i) => `const v${i} = ${i};`).join("\n") +
  "\nfunction sumAll() {\n  return ";

export const edgeCases: TestCase[] = [
  {
    id: "edge-empty-buffer",
    description: "Empty document — nothing to go on",
    category: "edge",
    languageId: "markdown",
    filePath: "scratch.md",
    prefix: "",
    suffix: "",
    expect: clean,
  },
  {
    id: "edge-whitespace-only",
    description: "Only indentation before the caret",
    category: "edge",
    languageId: "python",
    filePath: "ws.py",
    prefix: "def f():\n    ",
    suffix: "",
    expect: clean,
  },
  {
    id: "edge-partial-import",
    description: "Partial identifier in an import list (strongly determined)",
    category: "edge",
    languageId: "typescriptreact",
    filePath: "App.tsx",
    prefix: 'import { useState, useE',
    suffix: ' } from "react";',
    expect: { kind: "match", pattern: /ffect/ },
  },
  {
    id: "edge-inside-string",
    description: "Caret inside a string literal",
    category: "edge",
    languageId: "javascript",
    filePath: "msg.js",
    prefix: 'const msg = "Hello ',
    suffix: '";',
    expect: clean,
  },
  {
    id: "edge-unicode",
    description: "Non-ASCII content nearby must not corrupt output",
    category: "edge",
    languageId: "javascript",
    filePath: "i18n.js",
    prefix: 'const greeting = "こんにちは";\nconst farewell = ',
    suffix: ";",
    expect: clean,
  },
  {
    id: "edge-long-context",
    description: "Large prefix — should still complete the sum",
    category: "edge",
    languageId: "javascript",
    filePath: "big.js",
    prefix: longPrefix,
    suffix: ";\n}",
    expect: { kind: "nonEmpty" },
  },
];

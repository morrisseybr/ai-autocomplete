// Cases where the right answer is to suggest nothing: the statement/line is
// already complete and no insertion at the caret makes sense.

import type { TestCase } from "../types";

export const noCompletionCases: TestCase[] = [
  {
    id: "nocomp-complete-function",
    description: "Caret at end of a finished one-liner function",
    category: "no-completion",
    languageId: "python",
    filePath: "add.py",
    prefix: ["def add(a, b):", "    return a + b"].join("\n"),
    suffix: "",
    expect: { kind: "empty" },
    tags: ["smoke"],
  },
  {
    id: "nocomp-after-semicolon",
    description: "Caret right after a terminated statement",
    category: "no-completion",
    languageId: "javascript",
    filePath: "log.js",
    prefix: 'console.log("done");',
    suffix: "",
    expect: { kind: "empty" },
  },
  {
    id: "nocomp-closed-literal",
    description: "Caret after a complete assignment",
    category: "no-completion",
    languageId: "typescript",
    filePath: "const.ts",
    prefix: "const MAX_RETRIES = 3;",
    suffix: "",
    expect: { kind: "empty" },
  },
];

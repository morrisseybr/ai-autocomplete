// Simple, strongly-determined completions: there is essentially one obvious
// correct continuation, so we can assert its shape with a regex.

import type { TestCase } from "../types";

export const simpleCases: TestCase[] = [
  {
    id: "simple-add-return",
    description: "Body of a two-arg add() is `a + b`",
    category: "simple",
    languageId: "python",
    filePath: "math.py",
    prefix: ["def add(a, b):", "    return "].join("\n"),
    suffix: "",
    expect: { kind: "match", pattern: /a\s*\+\s*b/ },
  },
  {
    id: "simple-fibonacci",
    description: "Recursive fibonacci tail",
    category: "simple",
    languageId: "python",
    filePath: "fib.py",
    prefix: [
      "def fibonacci(n):",
      '    """Return the nth fibonacci number."""',
      "    if n < 2:",
      "        return n",
      "    return ",
    ].join("\n"),
    suffix: "",
    expect: { kind: "match", pattern: /fibonacci\(\s*n\s*-\s*1\s*\)/ },
    tags: ["smoke"],
  },
  {
    id: "simple-is-even",
    description: "Modulo check for evenness",
    category: "simple",
    languageId: "python",
    filePath: "nums.py",
    prefix: ["def is_even(n):", "    return "].join("\n"),
    suffix: "",
    expect: { kind: "match", pattern: /%\s*2/ },
  },
  {
    id: "simple-for-increment",
    description: "C-style for loop increment clause",
    category: "simple",
    languageId: "javascript",
    filePath: "loop.js",
    prefix: "for (let i = 0; i < 10; ",
    suffix: " {\n}",
    expect: { kind: "match", pattern: /i\s*\+\+|i\s*\+=\s*1/ },
  },
  {
    id: "simple-array-double",
    description: "Map callback doubling each element",
    category: "simple",
    languageId: "javascript",
    filePath: "arr.js",
    prefix: "const doubled = [1, 2, 3].map((n) => ",
    suffix: ");",
    expect: { kind: "match", pattern: /\bn\b/ },
  },
];

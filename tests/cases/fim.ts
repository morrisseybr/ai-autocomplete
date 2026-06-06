// Fill-in-the-middle: a real SUFFIX follows the caret. The completion must slot
// between prefix and suffix without re-typing the suffix or emitting slop.

import type { TestCase } from "../types";

export const fimCases: TestCase[] = [
  {
    id: "fim-template-literal",
    description: "Mid-template-literal (the slop regression) — raw code only",
    category: "fim",
    languageId: "javascript",
    filePath: "server.js",
    prefix: "app.listen(port, () => {\n    console.log(`App running at ",
    suffix: "\n});",
    expect: { kind: "match", pattern: /localhost|\$\{\s*port\s*\}|http/i },
    tags: ["smoke"],
  },
  {
    id: "fim-string-concat",
    description: "Reference the param inside a returned string",
    category: "fim",
    languageId: "javascript",
    filePath: "greet.js",
    prefix: 'function greet(name) {\n  return "Hello, " + ',
    suffix: ";\n}",
    expect: { kind: "match", pattern: /name/ },
  },
  {
    id: "fim-close-call",
    description: "Complete a call before an existing closing paren",
    category: "fim",
    languageId: "python",
    filePath: "io.py",
    prefix: 'with open("data.txt"',
    suffix: ") as f:\n    data = f.read()",
    expect: { kind: "nonEmpty" },
  },
  {
    id: "fim-json-key",
    description: "Continue a partial JSON key/value before the closing brace",
    category: "fim",
    languageId: "json",
    filePath: "pkg.json",
    prefix: '{\n  "name": "demo",\n  "ver',
    suffix: '\n}',
    expect: { kind: "match", pattern: /sion/ },
  },
];

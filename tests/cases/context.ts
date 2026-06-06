// Context-dependent cases: the suggestion should be informed by open files and
// the surrounding code. Hard to assert exact content deterministically, so these
// mostly check "produced a plausible, clean completion" plus a loose shape hint.

import type { TestCase } from "../types";

export const contextCases: TestCase[] = [
  {
    id: "ctx-call-local-fn",
    description: "Call a function defined earlier in the same file",
    category: "context",
    languageId: "javascript",
    filePath: "app.js",
    prefix: [
      "function formatPrice(cents) {",
      "  return `$${(cents / 100).toFixed(2)}`;",
      "}",
      "",
      "const label = format",
    ].join("\n"),
    suffix: "(1999);",
    expect: { kind: "match", pattern: /Price/ },
  },
  {
    id: "ctx-open-files",
    description: "Other open tabs are advertised; completion stays clean",
    category: "context",
    languageId: "typescript",
    filePath: "service.ts",
    prefix: [
      "import { User } from './models/user';",
      "",
      "export function greet(user: User) {",
      "  return `Hello, ${user.",
    ].join("\n"),
    suffix: "}`;\n}",
    openFiles: ["models/user.ts", "index.ts"],
    expect: { kind: "nonEmpty" },
  },
];

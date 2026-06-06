// Coverage across languages: the engine should complete idiomatically in each,
// not just in Python/JS.

import type { TestCase } from "../types";

export const multiLangCases: TestCase[] = [
  {
    id: "lang-go-add",
    description: "Go: return a + b",
    category: "multi-lang",
    languageId: "go",
    filePath: "math.go",
    prefix: ["func add(a, b int) int {", "\treturn "].join("\n"),
    suffix: "\n}",
    expect: { kind: "match", pattern: /a\s*\+\s*b/ },
  },
  {
    id: "lang-rust-add",
    description: "Rust: implicit-return a + b",
    category: "multi-lang",
    languageId: "rust",
    filePath: "math.rs",
    prefix: ["fn add(a: i32, b: i32) -> i32 {", "    "].join("\n"),
    suffix: "\n}",
    expect: { kind: "match", pattern: /a\s*\+\s*b/ },
  },
  {
    id: "lang-html-list-item",
    description: "HTML: next list item",
    category: "multi-lang",
    languageId: "html",
    filePath: "index.html",
    prefix: ["<ul>", "  <li>Item 1</li>", "  <li>"].join("\n"),
    suffix: "</li>\n</ul>",
    expect: { kind: "match", pattern: /item/i },
  },
  {
    id: "lang-bash-loop-var",
    description: "Bash: echo the loop variable",
    category: "multi-lang",
    languageId: "shellscript",
    filePath: "list.sh",
    prefix: ["#!/bin/bash", "for f in *.txt; do", "  echo "].join("\n"),
    suffix: "\ndone",
    expect: { kind: "match", pattern: /\$\{?f\}?/ },
  },
  {
    id: "lang-sql-where",
    description: "SQL: a WHERE predicate (open-ended → any clean clause)",
    category: "multi-lang",
    languageId: "sql",
    filePath: "query.sql",
    prefix: "SELECT id, name FROM users WHERE ",
    suffix: ";",
    expect: { kind: "nonEmpty" },
  },
];

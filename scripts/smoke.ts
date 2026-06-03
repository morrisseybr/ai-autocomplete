// Headless smoke test for the Claude provider (no VSCode required).
// Run: npm run smoke
//
// Validates OAuth auth, output cleaning, and end-to-end latency by asking for a
// completion at a <CURSOR> point in a small sample file.

import { ClaudeAgentProvider } from "../src/providers/claudeAgentProvider";

async function main() {
  const provider = new ClaudeAgentProvider({
    model: process.env.AI_AC_MODEL ?? "claude-haiku-4-5-20251001",
    onLog: (m) => console.log(`[log] ${m}`),
  });

  const prefix = [
    "def fibonacci(n):",
    '    """Return the nth fibonacci number."""',
    "    if n < 2:",
    "        return n",
    "    ",
  ].join("\n");

  const controller = new AbortController();
  const started = Date.now();

  const result = await provider.complete({
    languageId: "python",
    filePath: "sample.py",
    prefix,
    suffix: "",
    openFiles: ["sample.py", "utils.py"],
    workspaceRoot: process.cwd(),
    maxOutputTokens: 256,
    signal: controller.signal,
  });

  console.log(`\n=== completion (${Date.now() - started}ms) ===`);
  console.log(JSON.stringify(result.text));
  console.log("\n=== rendered ===");
  console.log(prefix + result.text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

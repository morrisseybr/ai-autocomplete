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

  // Case 1: an incomplete function — expect a real completion.
  const prefix = [
    "def fibonacci(n):",
    '    """Return the nth fibonacci number."""',
    "    if n < 2:",
    "        return n",
    "    ",
  ].join("\n");

  const result = await run(provider, prefix, "");
  console.log("\n=== rendered ===");
  console.log(prefix + result.text);

  // Case 2: already-complete code with the cursor on a trailing blank line —
  // expect NO suggestion (empty string, no explanatory prose).
  const completePrefix = [
    "def add(a, b):",
    "    return a + b",
    "",
    "",
  ].join("\n");

  const noResult = await run(provider, completePrefix, "");
  console.log(
    `\n=== no-completion case → ${noResult.text === "" ? "OK (empty)" : "FAIL: " + JSON.stringify(noResult.text)} ===`
  );
}

async function run(
  provider: ClaudeAgentProvider,
  prefix: string,
  suffix: string
) {
  const controller = new AbortController();
  const started = Date.now();
  const result = await provider.complete({
    languageId: "python",
    filePath: "sample.py",
    prefix,
    suffix,
    openFiles: ["sample.py", "utils.py"],
    workspaceRoot: process.cwd(),
    maxOutputTokens: 256,
    signal: controller.signal,
  });
  console.log(`\n=== completion (${Date.now() - started}ms) ===`);
  console.log(JSON.stringify(result.text));
  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

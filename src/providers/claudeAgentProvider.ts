import { cleanCompletion, NO_COMPLETION } from "../util/cleanCompletion";
import type {
  CompletionProvider,
  CompletionRequest,
  CompletionResult,
} from "./types";

// The agent SDK is ESM-only; VSCode extensions are CommonJS. Load it lazily via
// a dynamic import so the require/ESM mismatch is resolved at runtime, and so we
// don't pay the import cost until the first completion.
type QueryFn = typeof import("@anthropic-ai/claude-agent-sdk").query;
let queryFnPromise: Promise<QueryFn> | undefined;
function getQuery(): Promise<QueryFn> {
  if (!queryFnPromise) {
    queryFnPromise = import("@anthropic-ai/claude-agent-sdk").then(
      (m) => m.query
    );
  }
  return queryFnPromise;
}

// Fill-in-the-middle prompt. Keeping the output clean rests on: (1) presenting
// code with <PREFIX>/<SUFFIX> tags rather than a ``` fence (a fenced prompt makes
// the model reply with a fence + prose), (2) an explicit output contract with a
// WRONG/RIGHT contrast, and (3) few-shot examples pinning the exact raw format.
// cleanCompletion() is the safety net for anything that still slips through.
const SYSTEM_PROMPT = [
  "You are a fill-in-the-middle (FIM) code completion engine, like GitHub Copilot's inline suggestions.",
  "You receive code as <PREFIX> (text before the caret) and <SUFFIX> (text after the caret).",
  "Your ENTIRE response is inserted verbatim at the caret, so PREFIX + your_response + SUFFIX must be the final code.",
  "",
  "Output contract — your response must be ONLY the raw characters to insert. It is fed directly into the editor.",
  "NEVER include any of these: explanations, commentary, reasoning, apologies, leading/trailing prose,",
  "markdown, ``` code fences, language tags, or quotes/backticks wrapping the whole answer.",
  "Never repeat text that already appears in PREFIX or SUFFIX. Keep it short (finish the current line or a few lines).",
  `If the code is already complete or no insertion makes sense, respond with exactly ${NO_COMPLETION} (nothing else).`,
  "",
  "Examples — left of '=>' is the request, right of '=>' is the ONLY acceptable output:",
  "<PREFIX>def add(a, b):\\n    return </PREFIX><SUFFIX></SUFFIX> => a + b",
  "<PREFIX>const nums = [1, 2, 3].map((n) => </PREFIX><SUFFIX>)</SUFFIX> => n * 2",
  "<PREFIX>    console.log(`App running at </PREFIX><SUFFIX>\\n});</SUFFIX> => http://localhost:${port}`);",
  `<PREFIX>console.log("done");</PREFIX><SUFFIX></SUFFIX> => ${NO_COMPLETION}`,
  "",
  'WRONG output (never do this): "Here is the completion:\\n```js\\nx + y\\n```"',
  "RIGHT output for that same case: x + y",
].join("\n");

export interface ClaudeProviderConfig {
  model: string;
  // Disable the model's extended thinking. For autocomplete it adds ~4s of
  // latency with no quality benefit, so this defaults on in the config layer.
  disableThinking: boolean;
  // Path to the user's claude binary. Always set in practice — the package
  // ships without the SDK's bundled binary, so the SDK needs an explicit path.
  executablePath?: string;
  onLog?: (message: string) => void;
}

export class ClaudeAgentProvider implements CompletionProvider {
  readonly id = "claude";

  constructor(private readonly cfg: ClaudeProviderConfig) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (req.signal.aborted) {
      return { text: "", status: "aborted", latencyMs: 0 };
    }

    const userMessage = this.buildPrompt(req);

    // The SDK accepts its own AbortController; bridge the request's signal to it.
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (req.signal.aborted) {
      controller.abort();
    } else {
      req.signal.addEventListener("abort", onAbort, { once: true });
    }

    const started = Date.now();
    let collected = "";
    let usage: CompletionResult["usage"];
    let costUsd: number | undefined;

    try {
      const query = await getQuery();
      const stream = query({
        prompt: userMessage,
        options: {
          model: this.cfg.model,
          systemPrompt: SYSTEM_PROMPT,
          allowedTools: [],
          maxTurns: 1,
          cwd: req.workspaceRoot,
          abortController: controller,
          // Extended thinking adds ~4s to a trivial completion; turn it off.
          ...(this.cfg.disableThinking
            ? { thinking: { type: "disabled" as const } }
            : {}),
          // The SDK has no per-call max-output-tokens option, but the underlying
          // CLI honours this env var. Bound the generation so a runaway response
          // can't blow past what we'd ever insert as ghost text.
          env: {
            ...process.env,
            CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(req.maxOutputTokens),
          },
          // Use the user's installed claude binary (the package omits the SDK's).
          ...(this.cfg.executablePath
            ? { pathToClaudeCodeExecutable: this.cfg.executablePath }
            : {}),
        },
      });

      for await (const message of stream) {
        if (controller.signal.aborted) {
          break;
        }
        if (message.type === "assistant") {
          for (const block of message.message.content) {
            if (block.type === "text") {
              collected += block.text;
            }
          }
        } else if (message.type === "result") {
          // The result message carries the authoritative usage/cost figures.
          usage = {
            inputTokens: message.usage?.input_tokens,
            outputTokens: message.usage?.output_tokens,
          };
          costUsd = message.total_cost_usd;
          if (message.subtype === "success" && typeof message.result === "string") {
            // The result string is the authoritative final text.
            collected = message.result;
          }
          break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return { text: "", status: "aborted", latencyMs: Date.now() - started };
      }
      this.cfg.onLog?.(
        `claude provider error: ${err instanceof Error ? err.message : String(err)}`
      );
      return { text: "", status: "error", latencyMs: Date.now() - started };
    } finally {
      req.signal.removeEventListener("abort", onAbort);
    }

    const latencyMs = Date.now() - started;
    if (controller.signal.aborted) {
      return { text: "", status: "aborted", latencyMs, usage, costUsd };
    }

    // cleanCompletion strips fences and the sentinel; an empty result means
    // there is nothing to suggest.
    const text = cleanCompletion(collected, req.prefix);
    if (!text) {
      this.cfg.onLog?.(`claude: no completion (${latencyMs}ms)`);
      return { text: "", status: "empty", latencyMs, usage, costUsd };
    }
    this.cfg.onLog?.(
      `claude completion in ${latencyMs}ms, ${text.length} chars`
    );
    return { text, status: "ok", latencyMs, usage, costUsd };
  }

  private buildPrompt(req: CompletionRequest): string {
    const lines = [`Language: ${req.languageId}`, `File: ${req.filePath}`];
    if (req.openFiles.length > 0) {
      lines.push(`Open files: ${req.openFiles.join(", ")}`);
    }
    // No ``` fence here on purpose — it makes the model echo a fence + prose.
    lines.push(`<PREFIX>${req.prefix}</PREFIX>`);
    lines.push(`<SUFFIX>${req.suffix}</SUFFIX>`);
    // Recency reinforcement: the last thing the model reads is the contract.
    lines.push("Respond with ONLY the raw code to insert (no prose, no fences).");
    return lines.join("\n");
  }
}

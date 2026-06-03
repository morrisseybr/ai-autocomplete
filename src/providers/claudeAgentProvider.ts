import { cleanCompletion } from "../util/cleanCompletion";
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

const SYSTEM_PROMPT = [
  "You are a code autocomplete engine, like GitHub Copilot.",
  "You receive a code file with a <CURSOR> marker showing where the user's caret is.",
  "Output ONLY the raw text that should be inserted at <CURSOR> to continue the code.",
  "Rules:",
  "- No markdown fences, no language tags, no explanations, no comments about the code.",
  "- Do not repeat code that already appears before the cursor.",
  "- Produce a short, focused completion (typically the rest of the current line or a few lines).",
  "- Preserve the file's existing indentation style.",
  "- If no sensible completion exists, output nothing."
].join("\n");

export interface ClaudeProviderConfig {
  model: string;
  onLog?: (message: string) => void;
}

export class ClaudeAgentProvider implements CompletionProvider {
  readonly id = "claude";

  constructor(private readonly cfg: ClaudeProviderConfig) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (req.signal.aborted) {
      return { text: "" };
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
          // Don't pollute the user's session history with autocomplete calls.
          // (Persistence is irrelevant for one-shot, but explicit is clearer.)
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
          if (message.subtype === "success" && typeof message.result === "string") {
            // The result string is the authoritative final text.
            collected = message.result;
          }
          break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return { text: "" };
      }
      this.cfg.onLog?.(
        `claude provider error: ${err instanceof Error ? err.message : String(err)}`
      );
      return { text: "" };
    } finally {
      req.signal.removeEventListener("abort", onAbort);
    }

    const text = cleanCompletion(collected, req.prefix);
    this.cfg.onLog?.(
      `claude completion in ${Date.now() - started}ms, ${text.length} chars`
    );
    return { text };
  }

  private buildPrompt(req: CompletionRequest): string {
    const openList =
      req.openFiles.length > 0
        ? `Other open files in the editor: ${req.openFiles.join(", ")}\n`
        : "";

    return [
      `Language: ${req.languageId}`,
      `File: ${req.filePath}`,
      openList,
      "Complete the code at the <CURSOR> marker. Output only the insertion text.",
      "",
      "```",
      `${req.prefix}<CURSOR>${req.suffix}`,
      "```",
    ].join("\n");
  }
}

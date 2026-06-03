// Normalizes raw model output into text safe to insert as ghost text.
// The model is prompted to return only the raw insertion, but this is the
// safety net for the occasional markdown fence, prose, or sentinel leak.

// Token the model emits when nothing should be suggested. Shared with the
// provider's system prompt so both sides agree on the spelling.
export const NO_COMPLETION = "NO_COMPLETION";

export function cleanCompletion(raw: string, prefix: string): string {
  let text = raw;

  // If the model wrapped its answer in a markdown code fence (sometimes with
  // surrounding prose, e.g. "Here is the completion:\n```js\n...\n```"), take
  // the contents of the first fenced block and drop everything around it. The
  // `[^\n]*` after the opening fence swallows any language tag.
  const fence = text.match(/```[^\n]*\n([\s\S]*?)```/);
  if (fence) {
    text = fence[1];
  }

  // Strip the NO_COMPLETION sentinel wherever it appears — the model sometimes
  // appends it after a real answer or emits it on its own line.
  text = text.replace(/\bNO_COMPLETION\b/g, "");

  // Drop leading natural-language preamble lines the model may prepend (e.g.
  // "I'll complete this:", "Here is the completion:"). If every line is prose,
  // there is no real completion.
  const proseStart =
    /^\s*(I['’]ll\b|I will\b|I'?m\b|Sure[,.! ]|Here(?:'s| is)\b|Let me\b|Looking at\b|Based on\b|To (?:complete|continue)\b|The (?:cursor|code|completion|following|user)\b|This (?:completes|code|is)\b)/i;
  const lines = text.split("\n");
  let firstCode = 0;
  while (firstCode < lines.length && proseStart.test(lines[firstCode])) {
    firstCode++;
  }
  text = firstCode >= lines.length ? "" : lines.slice(firstCode).join("\n");

  // If the model echoed the tail of the prefix, remove the overlap so we don't
  // duplicate what the user already typed.
  const tail = prefix.slice(-200);
  for (let n = Math.min(tail.length, text.length); n > 0; n--) {
    if (text.startsWith(tail.slice(tail.length - n))) {
      text = text.slice(n);
      break;
    }
  }

  // Trim trailing whitespace/newlines; keep leading whitespace (indentation).
  text = text.replace(/\s+$/, "");

  return text;
}

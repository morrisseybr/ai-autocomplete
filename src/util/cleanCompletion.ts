// Normalizes raw model output into text safe to insert as ghost text.
// The model is instructed to return only the insertion, but we defensively
// strip markdown fences and accidental echoes of the surrounding code.

export function cleanCompletion(raw: string, prefix: string): string {
  let text = raw;

  // Strip a single wrapping markdown code fence if the model added one.
  const fence = text.match(/^\s*```[^\n]*\n([\s\S]*?)\n?```\s*$/);
  if (fence) {
    text = fence[1];
  }

  // Drop a leading language hint left over from a fence (e.g. "typescript\n").
  text = text.replace(/^[a-zA-Z0-9+#-]{1,15}\n/, (m) =>
    /^(if|for|let|var|def|func|class|public|private|const|return|import|from|while|else|case)\b/.test(
      m
    )
      ? m
      : ""
  );

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

# AI Autocomplete

Inline code autocomplete (ghost text) for VS Code, powered by AI CLIs. The first
backend is **Claude Code** (via the `@anthropic-ai/claude-agent-sdk`); the
architecture is provider-based so other AI CLIs can be added later.

## How it works

- You stop typing → after a short debounce, the extension gathers lean context
  (code around the cursor, the file path, open tab paths, and the workspace root
  for project context like `CLAUDE.md`) and asks a fast model for a completion.
- The suggestion appears as **muted ghost text** inline (not a dropdown).
- **Tab** accepts · **Esc** dismisses · continuing to type dismisses it and
  re-triggers after the next pause.

These accept/dismiss/retrigger behaviors are native to VS Code inline
completions — no custom keybindings required.

## Requirements

- The `claude` CLI installed and authenticated (`claude` logged in via OAuth, or
  `ANTHROPIC_API_KEY` set). The agent SDK spawns the native binary under the hood.
- Node.js 18+ and VS Code 1.85+.

## Develop

```bash
npm install
npm run build          # bundle to dist/extension.js
npm run smoke          # headless test of the Claude provider (prints latency)
```

Press **F5** in VS Code to launch an Extension Development Host, open a code
file, type, and pause to see suggestions.

## Settings (`aiAutocomplete.*`)

| Setting              | Default                        | Description                                  |
| -------------------- | ------------------------------ | -------------------------------------------- |
| `enabled`            | `true`                         | Enable/disable suggestions.                  |
| `provider`           | `claude`                       | AI backend to use.                           |
| `claude.model`       | `claude-haiku-4-5-20251001`    | Model (a fast one is recommended).           |
| `debounceMs`         | `600`                          | Pause before requesting a suggestion.        |
| `contextLinesBefore` | `50`                           | Lines before the cursor sent as context.     |
| `contextLinesAfter`  | `30`                           | Lines after the cursor sent as context.      |
| `maxOutputTokens`    | `256`                          | Upper bound on generated tokens.             |

## Commands

- **AI Autocomplete: Toggle Enabled**
- **AI Autocomplete: Trigger Suggestion** (`Alt+\`)

## Notes on latency

Each request spawns the `claude` binary, so cold latency is ~3–5s. A future
optimization keeps a warm session to amortize startup down to ~1–2s per
completion. See the plan for details.

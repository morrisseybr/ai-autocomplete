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
| `claude.disableThinking` | `true`                     | Turn off extended thinking (~3x faster).     |
| `debounceMs`         | `600`                          | Pause before requesting a suggestion.        |
| `contextLinesBefore` | `100`                          | Lines before the cursor sent as context.     |
| `contextLinesAfter`  | `50`                           | Lines after the cursor sent as context.      |
| `maxOutputTokens`    | `256`                          | Upper bound on generated tokens.             |
| `showLoadingIndicator` | `true`                       | Animated ghost-text spinner while generating.|

## Commands

- **AI Autocomplete: Toggle Enabled**
- **AI Autocomplete: Trigger Suggestion** (`Alt+\`)

## Notes on latency

With `claude.disableThinking` on (the default), completions take ~2s. Leaving
thinking enabled triples that (~6s) because the model "thinks" before answering —
wasted effort for short completions. A further optimization (a warm, reused
session) could shave another ~700ms but accumulates conversation state; it is a
documented follow-up, not yet implemented.

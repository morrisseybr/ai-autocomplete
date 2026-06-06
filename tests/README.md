# Autocomplete test & benchmark harness

Headless tests that drive `ClaudeAgentProvider` directly (no VS Code), used for
two things:

1. **Regression** (`npm test`) — a catalog of completion cases, from obvious to
   edge-case, each judged deterministically. Exits non-zero on any failure.
2. **Benchmark** (`npm run bench`) — runs that same catalog across a matrix of
   model × thinking × maxOutputTokens, reporting pass rate and latency per config.

Requires Claude Code installed and authenticated (the harness resolves the
binary via `resolveClaudePath`, or `AI_AC_CLAUDE_PATH`). Each run makes real API
calls.

## Layout

| File | Role |
| --- | --- |
| `types.ts` | `TestCase`, `Expectation`, `CaseResult`, `ProviderRunConfig`. |
| `cases/*.ts` | The case catalog, one file per category, aggregated in `cases/index.ts`. |
| `matchers.ts` | `judge()` = specific matcher + universal clean-output check. |
| `runner.ts` | `runCase()` (one case, one config, with timeout) + `mapPool()`. |
| `report.ts` | Aggregation, console tables, markdown/JSON report. |
| `run.ts` | `npm test` entrypoint (single config, pass/fail). |
| `bench.ts` | `npm run bench` entrypoint (config matrix). |

## How a case is judged

A case passes only if **both** hold:

- Its `expect` matcher passes (`empty`, `nonEmpty`, `match`, `notMatch`,
  `contains`, `notContains`, `predicate`, or `all`).
- For any non-empty result, the **universal check** passes: no markdown fence, no
  prose/slop preamble, no `NO_COMPLETION` leak, and it doesn't re-type the prefix
  tail.

Genuinely ambiguous cases (e.g. caret inside a string) use a `clean-or-empty`
predicate that always passes the specific matcher, so they effectively assert
only "didn't crash and didn't emit slop, whatever it suggested".

## Categories

`simple` · `fim` (with suffix) · `no-completion` · `multi-lang` · `edge` ·
`context`. Add cases by appending to the relevant `cases/*.ts` file.

## `npm test` flags

```
--category simple,fim     # restrict to categories
--id simple-add-return    # specific case id(s)
--tag smoke               # cases tagged smoke
--grep fib                # id/description regex
--quick                   # small high-signal subset
--model <id>              # override model
--thinking on|off         # override thinking
--max-tokens 256          # override max output tokens
--reps N                  # repeat each case N times (default 1)
--concurrency N           # parallel requests (default 4)
--timeout MS              # per-request timeout (default 30000)
```

Env overrides: `AI_AC_MODEL`, `AI_AC_THINKING=on|off`, `AI_AC_MAX_TOKENS`,
`AI_AC_CLAUDE_PATH`.

## `npm run bench` flags

```
--models haiku,sonnet,opus   # aliases or full ids (default all three)
--max-tokens 64,256          # token axis (default 64,256)
--no-thinking-on             # drop the thinking-on variants
--no-thinking-off            # drop the thinking-off variants
--categories simple,fim      # restrict cases
--quick                      # small subset of cases
--reps N                     # reps per case (default 3)
--concurrency N              # parallel requests (default 4)
--timeout MS                 # per-request timeout (default 45000)
```

Reports are written to `bench-results/bench-<timestamp>.{md,json}` (gitignored).
The full default matrix is 3 models × 2 thinking × 2 token sizes = 12 configs;
trim with the flags to control cost and time.

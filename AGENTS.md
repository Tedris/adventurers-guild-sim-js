# AGENTS.md

## Tool Call Budget

Every tool call (bash, write, edit, grep, etc.) counts against your token budget.
Stay under 4096 tokens per tool call or response.

- Prefer `Glob` over `find`, `Grep` over `grep`, `Read` over `cat`/`head`/`tail`.
- Use `offset`/`limit` on `Read` to avoid dumping large files.
- Split large edits into multiple targeted `Edit` calls rather than one massive one.
- Keep explanations terse. Output the answer, not a preamble.
- When a tool call exceeds the limit, the call silently fails — the user will see
  an error. If you get a "tool failed" or "context too long" error, immediately
  retry with a shorter version: fewer arguments, narrower search, more specific path.

## Git Workflow

- All story work merges to `dev` only — never merge directly to `main`.
- The user handles PRs from `dev` to `main` independently.
- Keep commits scoped to individual stories — one story per commit.
- Never bundle multiple stories or epics into a single commit.

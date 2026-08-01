---
name: context-protocol
description: MusicApp's rules for keeping the context files small and truthful. Consult BEFORE editing PROJECT-STATE.md, CLAUDE.md, AGENTS.md or docs/DECISIONS.md, and at the end of any unit or session. Covers what each file may contain, the hard size caps, how to compress instead of appending, and the ban on writing project facts to Claude Code memory.
---

# Context protocol

This project is built across many short sessions; any session may end at `/clear`. These files are
what survives. They only work if they stay small — `CLAUDE.md` and `AGENTS.md` are re-sent on every
single request, so a line added today is a line paid for on every future turn.

## Where each fact goes

One home per fact. Duplication is what makes these systems rot.

| Fact | Home | Loaded |
|---|---|---|
| Routing, locked rules, commands | `CLAUDE.md` | **always** — cap 90 lines |
| Stack divergences from training data | `AGENTS.md` | **always** — cap 15 lines |
| Where we are right now | `PROJECT-STATE.md` | at session start — cap 80 lines |
| A decision and its reason | `docs/DECISIONS.md` | on demand, last lines only |
| Conventions and procedures | `.claude/skills/` | on demand, per task |
| What the product is and why | `docs/BRIEF.md` | on demand |
| Versions, traps, rejected options | `docs/STACK.md` | on demand |
| What changed, when | `git log` | on demand |
| Per-unit spec | `work/handoffs/` | on demand, one unit |

If a fact has no home in this table, it does not belong in the repo.

## Never grow the always-loaded files

`CLAUDE.md` changes **only** when a locked decision changes, a skill is added to the routing table, or
a command changes. It is not a notebook.

When tempted to add a line to `CLAUDE.md`, route it instead:

| The urge | Where it actually goes |
|---|---|
| "Note that X works differently here" | the relevant skill body |
| "We decided Y" | `docs/DECISIONS.md`, one line |
| "Z is still broken" | `PROJECT-STATE.md` → `Watch` |
| "Here's how to do W" | a skill — create one if none fits |
| "Remember the user prefers V" | nowhere in this repo (see below) |

**Never write project facts to Claude Code memory** (`memory/`, `MEMORY.md`). Memory is unversioned,
invisible to teammates, and accumulates without review — the exact failure this system exists to
prevent. Project knowledge goes in the repo. Memory is only for the user's cross-project preferences.

Audit the permanent cost any time: `node .claude/context-audit.mjs`

## Refreshing PROJECT-STATE.md

Trigger: **a unit is finished, or the session is ending.** Not per commit — per-commit updates are
exactly how the file becomes a changelog.

Rewrite in place, never append. Max 80 lines. Per section:

- **Now** (1 line) — a *position*, not an activity. "checkout — payment wired, awaiting sandbox keys",
  not "working on the app".
- **Shape** (10 lines) — only if the product's nature actually changed. Otherwise leave it alone.
- **Done** (12 lines) — one line per **area**, never per commit. At the cap, **merge** lines by area;
  never drop the oldest, they are the foundational facts. Always carry the *boundary* ("read-only",
  "fr only") and the *gap* ("no pagination yet", "mock data") — those are invisible from the code.
- **Next** (3, ordered) — a fourth item belongs in `work/INDEX.md`, which is the backlog.
- **Watch** (5) — **delete** an entry when resolved. Never strike through, never mark "(fixed)".
- **Last updated** — today.

The test for every line: *would a fresh session act differently without it?* "Added the login form" —
no, the form is in the tree. "auth — email + session cookie, no password reset" — yes, the gap leaves
no trace in the code.

## Logging a decision

Append one line to `docs/DECISIONS.md`: `- YYYY-MM-DD — <what> — <why, ≤12 words>`.
Never edit an old line. A reversal is a new line referencing the original's date.

Reversing a locked decision also means: edit the line in `CLAUDE.md`, update any skill that taught the
old way, and add a `Watch` entry until the codebase matches.

## Closing checklist

- [ ] `PROJECT-STATE.md` rewritten in place, under 80 lines, every section within its cap
- [ ] `work/INDEX.md` status updated
- [ ] Any decision appended to `docs/DECISIONS.md`
- [ ] Nothing was appended to `CLAUDE.md` or `AGENTS.md`
- [ ] Nothing about this project was written to Claude Code memory

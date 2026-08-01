# Contributing — MusicApp

## Branch

- Active branch: **`psycho`**. Every feature gets its own `feature/*` branch off `psycho`, merged
  back with `--no-ff` after the user validates. Merging `psycho` → `master` triggers the signed
  GitHub release. Never commit directly to `master`.

## Commit messages

- **English**, conventional commits: `type(scope): description`, imperative subject (≤ ~72 chars) +
  a short body explaining _what_ and _why_. Use the `/commit` skill; never commit manually.
- **Selective staging only** — name the files. Never `git add .` or `git add -A`.
- **Never stage secrets**: `.env*`, `credentials*`, `*.key`, `*.pem`, `secret*`,
  `android/app/release.keystore`, `android/keystore.properties`.
- **No AI attribution — anywhere.** Never mention an AI assistant as author or co-author
  (no `Co-Authored-By`), nor in any "Generated with" trailer.
- Split unrelated work into separate, self-describing commits.

## Before committing

- `npx tsc --noEmit` and `npx eslint .` must pass.
- If native code changed: `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64` and the APK builds.
- Bump `versionName`/`versionCode` in `android/app/build.gradle` when the change is a release.

## Context protocol

Before ending a session or reporting a unit done:

- refresh `PROJECT-STATE.md` (rewrite in place, ≤80 lines — see the protocol in `CLAUDE.md`);
- update the status column in `work/INDEX.md`;
- append any decision made to `docs/DECISIONS.md`.

## Language

- All **code, comments and docs are in English**. User-facing UI strings are fr/en via `t()` and
  are never hardcoded.

## Pushing

- The assistant never pushes; it lists the `git push` command(s) for a human to run.

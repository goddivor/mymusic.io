# Decisions

Append one line per decision, newest at the bottom. Never rewrite, never delete — a reversal is a new
line that references the original's date.

Format: `- YYYY-MM-DD — <decision> — <why, ≤12 words>`

Read this file before questioning any locked decision in `CLAUDE.md`. The reason is here; the rule is
there.

- 2026-07-20 — Android native project committed to git — it was gitignored and got lost once
- 2026-07-20 — Comments English-only, before complex functions only — user mandate, no inline/JSX noise
- 2026-07-21 — Live theme via useThemedStyles/useTheme, i18n via t() — instant switch, no restart
- 2026-07-21 — Local library from MediaStore, not a folder walk — cover every file with metadata
- 2026-07-22 — Native YouTube tab on NewPipeExtractor, WebView kept as fallback — no ads, own UI
- 2026-07-22 — psycho is the working branch, master triggers the signed release — clear release gate
- 2026-07-22 — In-app updater from GitHub Releases + FileProvider install — self-update without a store
- 2026-07-23 — Library state in SQLite (op-sqlite), settings stay in AsyncStorage — relations + reliability
- 2026-07-23 — Downloads go to public Music/MusicApp via MediaSaver — survive uninstall, visible everywhere
- 2026-07-27 — Never store downloads in the cache dir — MIUI wipes it, playback died after days
- 2026-07-27 — Context system installed via project-forge — sessions must survive /clear
- 2026-07-27 — CLAUDE.md stays gitignored (local only), rest of the context system is versioned — user choice
- 2026-08-01 — LAN web player serves local covers via a token-gated /art/<id> endpoint — content:// URIs are unreachable from a browser
- 2026-08-01 — Debug build coexists with the signed release via applicationIdSuffix .debug + ${applicationId}.fileprovider authority — never uninstall the release to test
- 2026-08-01 — Library backup uses SAF (user-picked folder) via a native Backup module, auto on every change — survives uninstall on MIUI, no runtime permission; Music/MusicApp path failed under scoped storage and MIUI wipe

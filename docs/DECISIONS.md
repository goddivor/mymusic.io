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
- 2026-08-28 — Dev builds ship as a `dev` buildType (bundled JS, .debug id) — the release must never be uninstalled to test
- 2026-08-28 — Shuffle uses Fiedler's balanced spread, not a uniform shuffle — clustered artists read as "not random"
- 2026-08-28 — The phone owns the playback session; Connect output only picks the audio device — two independent players never stayed in sync

- 2026-08-28 — Fonts are applied by stripping fontWeight at the style funnel — each weight is its own family on Android
- 2026-08-28 — Launcher icon keeps a gradient adaptive background, never transparent — MIUI fills a transparent mask with black
- 2026-08-28 — Bundled fonts are committed under android/app/src/main/assets too — the release CI never runs react-native-asset
- 2026-08-28 — Stay on react-native-track-player 4.1.2; the notification keeps six buttons — v5 is @rntp/player, commercially licensed, and still exposes the same seven commands

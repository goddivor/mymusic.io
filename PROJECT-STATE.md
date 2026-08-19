# PROJECT-STATE

> Live state, not history. **Max 80 lines.** Rewrite in place — never append.
> History: `git log`. Decisions: `docs/DECISIONS.md`. Spec: `docs/BRIEF.md`.
> Last updated: 2026-08-19

## Now

v1.6.0 releasing — download queue upgrades (configurable parallelism + per-playlist limit, queued status,
retry-failed button) + playlist multiselect (play/queue/add/remove/delete) + delete-playlist choice
(playlist only vs also downloaded tracks). Merging psycho→master to trigger the signed release.

## Shape

MusicApp is an offline-first Android music player. Three tabs: Home, Library, YouTube. It scans local
audio via MediaStore (full metadata, cover art) and browses YouTube natively via NewPipeExtractor
(InnerTube): trending, search with suggestions, native video page, instant audio streaming, and
downloads that go to public `Music/MusicApp` so they survive an uninstall. Library state (tracks,
playlists, playlist folders, likes, play counts, recents) lives in SQLite; settings (theme, language)
in AsyncStorage. Playback runs through track-player with a notification, lock-screen controls, queue,
and swipe-to-change-track. A tap on the profile avatar opens a push drawer; an embedded NanoHTTPD
server streams the whole library to a browser over the LAN (PIN-paired). Theme (dark/light/system)
and language (fr/en/system) switch live. The app self-updates from GitHub Releases. No account, no server.

## Done

- [x] native modules — YtExtractor, WebServer, MediaScanner, MediaSaver, AppUpdater. Android only; New-Arch only.
- [x] local library — MediaStore scan with metadata + art; excludes Music/MusicApp (those are YouTube tracks).
- [x] youtube — native tab (trending/search/suggest/comments/related), streaming, downloads. Web view kept as fallback.
- [x] downloads — public Music/MusicApp via MediaSaver; queue with configurable parallelism + per-playlist limit (settings), queued/extracting states, retry-failed, auto-repair at startup.
- [x] library graph — albums, playlists, playlist folders, likes, play counts, recents — in SQLite (migrated from AsyncStorage).
- [x] player — background audio, queue drag-reorder, shuffle/repeat, swipe prev/next on mini-bar and now-playing.
- [x] UI system — live theme + i18n, push drawer, searchable settings, official YouTube logo.
- [x] platform — LAN web player (+ Vite webapp), in-app GitHub updater, signed release CI (psycho→master).
- [x] web player — serves local album art (/art), music-note fallback, redesign, shuffle/repeat + play history.
- [x] backup — SAF user-picked folder, auto on every change, restore prompt on empty library; survives uninstall.
- [x] dev — debug build (com.musicapp.debug) coexists with the signed release; never uninstall the release.
- [x] collections — playlist multiselect (play/queue next/add/remove/delete downloads) + delete-playlist choice keeps or erases downloaded tracks.

## Next

1. Confirm on device that auto-repair re-downloads the user's broken tracks and swipe works.
2. Listening stats screen — play counts are already tracked (unit `listening-stats`).
3. Optional: player styles / account connect (both `⬜ todo`, scope to confirm).

## Watch

- Downloads must NEVER use the cache dir — MIUI wipes it; playback died after days. Fixed in v1.4.0, verify on device.
- NewPipeExtractor breaks when YouTube changes format — bump `v0.26.4` in `android/app/build.gradle` to fix.
- Release keystore is local + a GitHub secret only. Lose it → cannot ship updates over the same install.
- No automated tests (deliberate) — every change is validated manually on a device.
- Old downloads made before v1.4.0 may point at wiped cache paths; startup repair re-fetches them (needs internet).

## Resume

Read in order: `CLAUDE.md` → `docs/BRIEF.md` → this file → `work/handoffs/listening-stats.md`
Validate with: `npx tsc --noEmit && npx eslint .`

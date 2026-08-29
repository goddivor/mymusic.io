# PROJECT-STATE

> Live state, not history. **Max 80 lines.** Rewrite in place — never append.
> History: `git log`. Decisions: `docs/DECISIONS.md`. Spec: `docs/BRIEF.md`.
> Last updated: 2026-08-28

## Now

v1.9.0 releasing — Identify: hold the phone to whatever is playing, in the room or in another app on
the phone, and the match feeds straight into the download pipeline. Every identification is kept so a
song caught offline can be fetched later. Recognition runs on AudD with a user-supplied key.

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
- [x] connect — phone owns the session; the browser mirrors it, controls it, or takes over the audio (/state + /command).
- [x] player polish — palette-tinted player, finger-tracking cover carousel, balanced shuffle, session restored on relaunch.
- [x] branding — adaptive launcher icon, circular splash screen (AndroidX backport), monochrome status icon, all derived from branding/*.svg.
- [x] appearance — OLED black scheme and a bundled Inter/Roboto font picker, both applied live at the style funnel.
- [x] now playing — player-style/equalizer/overflow header actions, label-free footer, paging artwork carousel, cover-tinted notification.
- [x] identify — one microphone session that survives leaving the app (foreground service), triggers on sustained sound, looks up on AudD, tints from the cover, downloads through the YouTube pipeline, and keeps a history.

## Next

1. Confirm on device: notification tint on a track whose artwork loads, and the launcher icon after MIUI clears its cache.
2. Implement the now playing overflow actions — they are placeholders today.
3. Identify: a floating bubble instead of the notification, if the system-overlay permission proves workable on MIUI.
4. Listening stats screen — play counts are already tracked (unit `listening-stats`).
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

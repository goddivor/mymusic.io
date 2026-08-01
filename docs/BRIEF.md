# Brief — MusicApp

> What and why. Technical choices live in `docs/STACK.md`; current progress in `PROJECT-STATE.md`.
> Written 2026-07-27. Rewrite this file when the product changes — do not append revisions.

## In one paragraph

MusicApp is an offline-first Android music player for someone who wants their music, theirs — that
lets them play their local files, browse and download audio from YouTube natively, and stream their
whole library to a browser over Wi-Fi, all with no account and no server.

## The problem

Streaming apps need an account, a connection and a subscription, and lock your music inside them.
Existing YouTube-to-audio tools are ad-ridden WebView wrappers.

Today, the user does this instead: juggles a file manager, a separate downloader app, and a basic
local player.

## v1 ships

- Local library via Android MediaStore, with full metadata and cover art.
- Native YouTube tab (InnerTube via NewPipeExtractor): trending, search with suggestions, native
  video page, instant audio streaming, downloads to public storage.
- Background playback (notification + lock screen), queue, shuffle, repeat, swipe to change track.
- Playlists, playlist folders, likes, play counts, recents.
- Embedded LAN web player (PIN-paired) and a browser webapp.
- Live dark/light/system theme and fr/en/system language, both instant.
- In-app self-update from GitHub Releases; SQLite persistence + backup export/import.

## v1 does NOT ship

- No iOS (eventual, not refused — native modules and NewPipe are Android-only).
- No user account, no cloud sync, no server-side anything.
- No automated tests (deliberate — validation is manual on a device).
- No offline YouTube browsing (extraction needs a connection).
- No podcasts, no video playback inside the native player (audio only).

## Hard constraints

- Android only. Builds require JDK 21 (`JAVA_HOME`). New Architecture only (RN 0.85).
- Personal use first, but the APK is public on GitHub Releases for wider sharing.
- Personal use of YouTube content — respect YouTube's Terms of Service.

## Success in three months

Stabilise the existing app (reliable offline playback, robust downloads, fewer bugs) while adding new
features (listening stats, account connect, player styles) — without regressing the core.

## Design seed

- **References liked**: Spotify / YouTube Music interaction patterns (swipe to change track, side drawer).
- **Specifically, what works about them**: fluid gestures, clear now-playing, uncluttered library.
- **Must not look/feel like**: an ad-heavy downloader wrapper; Spotify green.
- **Fixed brand elements**: violet→pink accent (`#B57BFF`→`#FF6FB5`); "Ta musique, à toi." tagline.
- **Tone**: personal, playful, French-first UI copy.

## Open questions

- Which new feature comes first after stabilisation — listening stats, account connect, or player styles?

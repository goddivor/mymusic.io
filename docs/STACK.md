# Stack — MusicApp

> Every version below was verified on the web on its stated date. **Never update a version here from
> memory** — re-verify, then edit. Divergences from training data are mirrored in `AGENTS.md`.

## Decision axes

- New-Architecture support (RN 0.85 is New-Arch-only — no Bridge fallback).
- Android-native reach: MediaStore, background audio, HTTP server, package installer.
- No account / no server: everything runs on-device or over the LAN.
- Synchronous, reliable on-device persistence that survives an uninstall where possible.

## Chosen

### App framework — React Native `0.85.3` (New Architecture)
- Chosen 2026-07-20. Verified against https://reactnative.dev/blog/2026/04/07/react-native-0.85 (2026-07-27).
- **Why**: one TypeScript codebase driving custom Android native modules.
- **Trap**: New-Arch-only, legacy Bridge removed — see `AGENTS.md`. React 19.2.3.

### Playback — react-native-track-player `4.1.2`
- **Why**: background audio, notification + lock-screen controls, queue.
- **Rejected**: expo-av — needs Expo; less control over the foreground service.
- **Trap**: not New-Arch-ready out of the box — 4 patches via patch-package (`patches/`, reapplied on postinstall).

### YouTube extraction — NewPipeExtractor `v0.26.4` (native, JitPack)
- **Why**: InnerTube client (search, trending, comments, streams) with no API key/quota.
- **Trap**: unofficial — breaks when YouTube changes format; bump the version to fix. poToken makes
  audio-only streams empty → muxed progressive fallback in `YtExtractorModule.java`.

### Persistence — @op-engineering/op-sqlite `17.1.2`
- Verified against https://www.npmjs.com/package/@op-engineering/op-sqlite (2026-07-27; latest 17.1.3).
- **Why**: fast JSI SQLite with a synchronous API (`executeSync`) that fits the store's update flow.
- **Rejected**: AsyncStorage as the primary store — key-value, no relations (kept only for settings).

### Embedded server — NanoHTTPD `2.3.1` (native)
- **Why**: tiny HTTP server to serve the webapp and stream tracks with Range support over the LAN.

### Web player — Vite + React 18, built into `android/app/src/main/assets/webapp/`
- **Why**: the browser client the LAN server serves; bundled into the APK.

## Rejected, and why

| Option | Why not |
|---|---|
| Expo | Custom Android native modules (MediaStore, HTTP server, package installer) need bare RN. |
| YouTube Data API v3 | API key, quotas, no stream access. |
| AsyncStorage as main DB | No relations; unreliable for the library graph. |

## Known traps

- **MIUI clears app cache** aggressively — downloads must never live in the cache dir (they go to
  public `Music/MusicApp` via `MediaSaver`, with a persistent private fallback).
- **MediaStore `DATA` can be null** on Android 10+ — compute the public path deterministically.
- **Java 25 on this machine is a JRE** (no compiler) — builds need `JAVA_HOME=…/java-21-openjdk`.
- **op-sqlite**: use `executeSync()` for synchronous queries; `execute()` returns a Promise.

## Upgrade posture

- Next expected breaking release: NewPipeExtractor bumps whenever YouTube extraction breaks.
- Upgrade policy: pin exact versions; upgrade deliberately as its own `feature/*` iteration, never inside the forge.

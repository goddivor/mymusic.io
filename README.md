<div align="center">

# MusicApp

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff&style=flat)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react&logoColor=61DAFB&labelColor=333&style=flat)](https://reactnative.dev/)
[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=fff&labelColor=333&style=flat)](https://www.android.com/)

[![react-native-track-player](https://img.shields.io/npm/v/react-native-track-player?logo=npm&logoColor=fff&label=react-native-track-player&labelColor=333&color=CB3837&style=flat)](https://www.npmjs.com/package/react-native-track-player)
[![NewPipeExtractor](https://img.shields.io/badge/NewPipeExtractor-v0.26.4-CD201F?logo=youtube&logoColor=fff&labelColor=333&style=flat)](https://github.com/TeamNewPipe/NewPipeExtractor)
[![NanoHTTPD](https://img.shields.io/badge/NanoHTTPD-2.3.1-5C2D91?logo=openjdk&logoColor=fff&labelColor=333&style=flat)](https://github.com/NanoHttpd/nanohttpd)

[![Stars](https://img.shields.io/github/stars/goddivor/mymusic.io?logo=github&logoColor=fff&label=Stars&labelColor=333&color=E3B341&style=flat)](https://github.com/goddivor/mymusic.io/stargazers)
[![Forks](https://img.shields.io/github/forks/goddivor/mymusic.io?logo=github&logoColor=fff&label=Forks&labelColor=333&color=8957E5&style=flat)](https://github.com/goddivor/mymusic.io/network/members)
[![Watchers](https://img.shields.io/github/watchers/goddivor/mymusic.io?logo=github&logoColor=fff&label=Watchers&labelColor=333&color=1F6FEB&style=flat)](https://github.com/goddivor/mymusic.io/watchers)
[![Contributors](https://img.shields.io/github/contributors/goddivor/mymusic.io?logo=github&logoColor=fff&label=Contributors&labelColor=333&color=DB61A2&style=flat)](https://github.com/goddivor/mymusic.io/graphs/contributors)
[![Open issues](https://img.shields.io/github/issues/goddivor/mymusic.io?logo=github&logoColor=fff&label=Issues&labelColor=333&color=3FB950&style=flat)](https://github.com/goddivor/mymusic.io/issues)

Your music, yours. A fully offline-first Android music player — local library,
native YouTube browsing with instant audio streaming and downloads, and a
built-in Wi-Fi web player. No account, no ads, no server.

</div>

## Screenshots

<p align="center">
  <img src="docs/screenshots/dark-home.jpg" width="30%" alt="Home (dark)" />
  <img src="docs/screenshots/dark-library.jpg" width="30%" alt="Library (dark)" />
  <img src="docs/screenshots/dark-youtube.jpg" width="30%" alt="YouTube search (dark)" />
</p>

<p align="center">
  <img src="docs/screenshots/light-player.jpg" width="30%" alt="Now playing (light)" />
  <img src="docs/screenshots/light-queue.jpg" width="30%" alt="Queue (light)" />
  <img src="docs/screenshots/light-downloads.jpg" width="30%" alt="Downloads (light)" />
</p>

## Features

- **Local library** — every audio file on the device via Android MediaStore,
  with full metadata: title, artist, album, cover art, duration. Albums,
  playlists and playlist folders, likes, play counts and recents.
- **Native YouTube tab** — trending feed, search with live suggestions, native
  video pages (views, likes, related videos, comments). No WebView, no ads.
- **Instant audio streaming** — play any YouTube video as audio in one tap,
  in the background, screen off.
- **Audio downloads** — download videos, whole playlists or YouTube Music
  albums as audio for offline listening; playlists are recreated locally.
- **Background playback** — notification and lock-screen controls, queue
  management with drag-to-reorder, shuffle and repeat.
- **Web access** — one switch starts an embedded LAN server: open the address
  on any computer on the same Wi-Fi, pair with a PIN and stream your whole
  library from the browser.
- **Live theme & language** — dark / light / system theme and English / French
  interface, both switchable instantly.

## Requirements

- Node.js ≥ 20 and npm
- JDK 21 (`JAVA_HOME` must point to it)
- Android SDK (API 36) with an Android device or emulator
- Linux/macOS/Windows — Android builds only

## Installation

```bash
# 1. Clone and install dependencies
git clone https://github.com/goddivor/mymusic.io.git
cd mymusic.io
npm install

# 2. Build the embedded web player (served by the in-app LAN server)
npm run webapp:build

# 3. Start Metro
npm start

# 4. In another terminal, build and install on a connected device
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
npm run android
```

To build a standalone debug APK:

```bash
cd android && ./gradlew :app:assembleDebug
# APK -> android/app/build/outputs/apk/debug/app-debug.apk
```

---

<div align="center">
For personal use only — please respect YouTube's Terms of Service.
</div>

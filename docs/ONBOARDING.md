# Onboarding — MusicApp

Written for a human. Read this once, then let the handoffs and skills drive the work.

## 1. Mental model

A React Native 0.85 (Android-only, New Architecture) music player. TypeScript drives the UI; five
custom Android native modules do the heavy lifting (YouTube extraction, MediaStore scan, LAN HTTP
server, public-storage saving, self-update). Library state lives in SQLite; the UI is themed and
bilingual. No account, no server.

## 2. First ten minutes

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64   # required — system Java 25 has no compiler
npm install
npm run webapp:build                                   # embed the LAN web player into android assets
npm start                                              # Metro, in one terminal
npm run android                                        # build + install debug on a connected device
```

Then read, in order: `CLAUDE.md` → `PROJECT-STATE.md` → `.claude/skills/musicapp-conventions/` →
`work/INDEX.md`.

## 3. How to build a screen

1. Open **`work/INDEX.md`** and pick a unit (start with P0).
2. Open its **handoff** `work/handoffs/<unit>.md`.
3. Paste that unit's block from **`work/START-PROMPTS.md`** into Claude Code, or follow the
   `build-a-screen` skill yourself.
4. Validate: `npx tsc --noEmit && npx eslint .` (+ build & on-device check if native changed).
5. Refresh `PROJECT-STATE.md` and the INDEX status before calling it done.

## 4. Where things live

- `App.tsx` — tab host, modals, drawer, startup (permission + update check).
- `src/screens/` — full-screen views · `src/components/` — shared UI + bottom sheets.
- `src/lib/` — non-UI logic (ytExtractor, player, scanMusic, webServer, updater, backup).
- `src/store/library.tsx` — the library context · `src/db/database.ts` — SQLite.
- `src/i18n.ts` — fr/en + `t()` · `src/theme.ts` + `src/store/theme.tsx` — palette + provider.
- `android/app/src/main/java/com/musicapp/<module>/` — native modules.
- `webapp/` — Vite LAN web player (built into android assets).

## 5. Reference examples — copy these patterns

- A screen: `src/screens/RecentsScreen.tsx` (themed styles + `t()` + FlatList).
- A native module: `android/.../mediascanner/` (`*Module.java` + `*Package.java`).
- Persistence: `src/db/database.ts` (`executeSync`, save-by-replace).

## 6. Conventions cheat-sheet

- Strings → `t('key')`. Styles → `useThemedStyles(makeStyles)` + `useTheme()`.
- Comments: English, only before a complex function. No inline / JSX / divider comments.
- Never import the mutable `theme` object into a component.

## 7. What does NOT exist yet

- Listening stats, account connect, player styles (drawer entries show "coming soon").
- iOS. Automated tests. Offline YouTube browsing.

## 8. Session hygiene

Sessions are meant to be short. Any session can end at `/clear`.

- Starting cold? Say "continue the project" — the `project-resume` skill reloads the context.
- Adding or changing something? The `project-feature` skill runs the unit loop and keeps
  `PROJECT-STATE.md` honest.
- Never rely on conversation memory that is not written into a file.

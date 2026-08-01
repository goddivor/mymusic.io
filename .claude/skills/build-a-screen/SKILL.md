---
name: build-a-screen
description: Procedure to implement (or edit) a MusicApp screen from its handoff. Use whenever asked to build, code or change a screen (home, library, youtube, now-playing, search, settings, a bottom sheet, …). Ensures the handoff, the conventions and the context protocol are read and respected BEFORE coding.
---

# Build a MusicApp screen

Follow these steps **in order**. Do not skip reading the sources.

## 1. Load context (mandatory, BEFORE coding)

1. **`PROJECT-STATE.md`** — what already exists, what is decided, what is next.
2. **Handoff**: `work/handoffs/<unit>.md` — entry point, pieces, states, DoD, prompt.
3. **Reference**: the existing implementation in `src/screens/` — match its shape.
4. **Specs**: `docs/BRIEF.md` (the section for this unit) · `docs/STACK.md` (traps for the APIs used).
5. **Conventions**: skill `musicapp-conventions`.

## 2. Decompose

- A screen is a default-exported component in `src/screens/`, hosted from `App.tsx` (tab or modal).
- Reuse before creating: check `src/components/` for a row, sheet, tile or icon that already exists
  (`TrackRow`, `CollectionRow`, `YtVideoRow`, `SwipeableSheet`, `GradientTile`, `Ic`).
- Non-UI logic (native calls, parsing, persistence) goes to `src/lib/` or `src/store/`, never inline.

## 3. Build

Direction: data from `useLibrary()` / `src/lib/` → themed, translated UI.

- `useTheme()` + `useThemedStyles(makeStyles)`; every colour from the palette.
- Every user string through `t()`, added to both `fr` and `en` in `src/i18n.ts`.
- Playback via `src/lib/player.ts` / `react-native-track-player`; never touch files directly in the UI.

## 4. Data

- Read library state from `useLibrary()`. Mutations go through the store actions, which persist to
  SQLite (`src/db/database.ts`). Never write library data to AsyncStorage.
- YouTube/network via the `src/lib/ytExtractor.ts` wrappers; handle the failure/empty states.

## 5. Verify (Definition of Done)

- [ ] All states handled (loading, empty, error, offline where relevant)
- [ ] Strings translated (fr + en); styles themed (dark + light)
- [ ] `npx tsc --noEmit` and `npx eslint .` pass
- [ ] If native code changed: APK builds with JDK 21 and runs on a device

## 6. Close the loop (never skip)

- Refresh `PROJECT-STATE.md`: update `Now`, add or merge a `Done` line **by area**, re-order `Next`,
  add any new `Watch`. Rewrite in place, stay under 80 lines.
- Set this unit's status to `✅ done` in `work/INDEX.md`.
- Append any decision taken to `docs/DECISIONS.md`, one line.

A unit is not done until this step is done.

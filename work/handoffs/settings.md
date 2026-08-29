# Handoff — Settings

> **Entry**: `modal from drawer` · **Priority**: P1 · **Container**: `App.tsx`

## 1. Read BEFORE coding (mandatory)

- 📍 **State**: [`../../PROJECT-STATE.md`](../../PROJECT-STATE.md) — what exists, what is decided
- 🎨 **Artifact**: [`settings.html`](../mockups/settings.html) — the visual reference to match
- 💻 **Reference**: the existing implementation, `src/screens/SettingsScreen.tsx` — match its conventions
- 📐 **Spec**: `docs/BRIEF.md`
- ⚠️ **Traps**: `docs/STACK.md` — check the APIs this unit uses
- 🛠️ **Skills**: `build-a-screen`, `musicapp-conventions`

## 2. Entry & files

- **Entry**: `modal from drawer`
- **Implementation**: `src/screens/SettingsScreen.tsx`
- **Container**: `App.tsx`

## 3. Pieces — reuse first, create in the right layer if missing

**lib**

- updater
- backup

## 4. States to cover

- language/theme pickers
- searchable settings
- data backup
- check for updates

## 5. Watch-points

- centered header with search

## 6. Definition of Done

- [ ] Matches the artifact `settings.html`
- [ ] All states in §4 are handled
- [ ] strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21
- [ ] Reuses shared pieces — no duplicated ad-hoc code
- [ ] `npx tsc --noEmit && npx eslint .` passes
- [ ] `PROJECT-STATE.md` refreshed and INDEX status updated

## 7. Start prompt (paste to Claude Code)

```
Work on "Settings" for MusicApp (modal from drawer). BEFORE coding, read: work/handoffs/settings.md, the artifact work/mockups/settings.html, the existing implementation in src/screens/SettingsScreen.tsx, and the build-a-screen skill (+ musicapp-conventions). Follow the layered architecture (context -> src/lib + src/db -> native modules) (container App.tsx) and REUSE our shared pieces. strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21. Finish with: npx tsc --noEmit && npx eslint .. Then refresh PROJECT-STATE.md and set this unit's status in work/INDEX.md.
```

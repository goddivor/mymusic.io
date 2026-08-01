# Handoff — YouTube (native tab)

> **Entry**: `tab` · **Priority**: P0 · **Container**: `App.tsx`

## 1. Read BEFORE coding (mandatory)

- 📍 **State**: [`../../PROJECT-STATE.md`](../../PROJECT-STATE.md) — what exists, what is decided
- 💻 **Reference**: the existing implementation, `src/screens/YoutubeScreen.tsx` — match its conventions
- 📐 **Spec**: `docs/BRIEF.md`
- ⚠️ **Traps**: `docs/STACK.md` — check the APIs this unit uses
- 🛠️ **Skills**: `build-a-screen`, `musicapp-conventions`

## 2. Entry & files

- **Entry**: `tab`
- **Implementation**: `src/screens/YoutubeScreen.tsx`
- **Container**: `App.tsx`

## 3. Pieces — reuse first, create in the right layer if missing

**UI**

- YtVideoRow
- DownloadsSheet

**lib**

- ytExtractor (search/trending/suggest)

## 4. States to cover

- trending
- search + suggestions
- load more
- error/offline

## 5. Watch-points

- InnerTube via NewPipeExtractor; web fallback via globe icon

## 6. Definition of Done

- [ ] Consistent with the surrounding code
- [ ] All states in §4 are handled
- [ ] strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21
- [ ] Reuses shared pieces — no duplicated ad-hoc code
- [ ] `npx tsc --noEmit && npx eslint .` passes
- [ ] `PROJECT-STATE.md` refreshed and INDEX status updated

## 7. Start prompt (paste to Claude Code)

```
Work on "YouTube (native tab)" for MusicApp (tab). BEFORE coding, read: work/handoffs/youtube.md, the existing implementation in src/screens/YoutubeScreen.tsx, and the build-a-screen skill (+ musicapp-conventions). Follow the layered architecture (context -> src/lib + src/db -> native modules) (container App.tsx) and REUSE our shared pieces. strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21. Finish with: npx tsc --noEmit && npx eslint .. Then refresh PROJECT-STATE.md and set this unit's status in work/INDEX.md.
```

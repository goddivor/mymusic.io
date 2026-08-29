# Handoff — YouTube video page

> **Entry**: `modal from youtube` · **Priority**: P0 · **Container**: `App.tsx`

## 1. Read BEFORE coding (mandatory)

- 📍 **State**: [`../../PROJECT-STATE.md`](../../PROJECT-STATE.md) — what exists, what is decided
- 🎨 **Artifact**: [`youtube-video.html`](../mockups/youtube-video.html) — the visual reference to match
- 💻 **Reference**: the existing implementation, `src/screens/YoutubeVideoScreen.tsx` — match its conventions
- 📐 **Spec**: `docs/BRIEF.md`
- ⚠️ **Traps**: `docs/STACK.md` — check the APIs this unit uses
- 🛠️ **Skills**: `build-a-screen`, `musicapp-conventions`

## 2. Entry & files

- **Entry**: `modal from youtube`
- **Implementation**: `src/screens/YoutubeVideoScreen.tsx`
- **Container**: `App.tsx`

## 3. Pieces — reuse first, create in the right layer if missing

**lib**

- ytExtractor getVideoInfo/getComments
- htmlText

## 4. States to cover

- Video/Play/Download actions
- Comments + Related tabs
- load error

## 5. Watch-points

- Play streams audio instantly; comment timestamps tinted

## 6. Definition of Done

- [ ] Matches the artifact `youtube-video.html`
- [ ] All states in §4 are handled
- [ ] strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21
- [ ] Reuses shared pieces — no duplicated ad-hoc code
- [ ] `npx tsc --noEmit && npx eslint .` passes
- [ ] `PROJECT-STATE.md` refreshed and INDEX status updated

## 7. Start prompt (paste to Claude Code)

```
Work on "YouTube video page" for MusicApp (modal from youtube). BEFORE coding, read: work/handoffs/youtube-video.md, the artifact work/mockups/youtube-video.html, the existing implementation in src/screens/YoutubeVideoScreen.tsx, and the build-a-screen skill (+ musicapp-conventions). Follow the layered architecture (context -> src/lib + src/db -> native modules) (container App.tsx) and REUSE our shared pieces. strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21. Finish with: npx tsc --noEmit && npx eslint .. Then refresh PROJECT-STATE.md and set this unit's status in work/INDEX.md.
```

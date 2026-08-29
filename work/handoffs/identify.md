# Handoff — Identify

> **Entry**: `modal from home header` · **Priority**: P1 · **Container**: `App.tsx`

## 1. Read BEFORE coding (mandatory)

- 📍 **State**: [`../../PROJECT-STATE.md`](../../PROJECT-STATE.md) — what exists, what is decided
- 🎨 **Artifact**: [`identify.html`](../mockups/identify.html) — the visual reference to match
- 💻 **Reference**: the existing implementation, `src/screens/IdentifyScreen.tsx` — match its conventions
- 📐 **Spec**: `docs/BRIEF.md`
- ⚠️ **Traps**: `docs/STACK.md` — check the APIs this unit uses
- 🛠️ **Skills**: `build-a-screen`, `musicapp-conventions`

## 2. Entry & files

- **Entry**: `modal from home header`
- **Implementation**: `src/screens/IdentifyScreen.tsx`
- **Container**: `App.tsx`

## 3. Pieces — reuse first, create in the right layer if missing

**UI**

- AddToPlaylistSheet

**lib**

- recognise (capture + AudD lookup)
- db: identifications table

**native**

- AudioRecorder + IdentifyService (foreground, microphone type)

## 4. States to cover

- listening
- match
- no match
- no sound
- history
- permission denied
- offline
- key missing

## 5. Watch-points

- A match feeds the existing YouTube search → download pipeline
- One microphone stream stays open for the whole session: reopening it in bursts made the audio policy duck whatever else was playing
- The trigger needs 700ms of sustained level, so a chime does not burn the attempt

## 6. Definition of Done

- [ ] Matches the artifact `identify.html`
- [ ] All states in §4 are handled
- [ ] strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21
- [ ] Reuses shared pieces — no duplicated ad-hoc code
- [ ] `npx tsc --noEmit && npx eslint .` passes
- [ ] `PROJECT-STATE.md` refreshed and INDEX status updated

## 7. Start prompt (paste to Claude Code)

```
Work on "Identify" for MusicApp (modal from home header). BEFORE coding, read: work/handoffs/identify.md, the artifact work/mockups/identify.html, the existing implementation in src/screens/IdentifyScreen.tsx, and the build-a-screen skill (+ musicapp-conventions). Follow the layered architecture (context -> src/lib + src/db -> native modules) (container App.tsx) and REUSE our shared pieces. strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21. Finish with: npx tsc --noEmit && npx eslint .. Then refresh PROJECT-STATE.md and set this unit's status in work/INDEX.md.
```

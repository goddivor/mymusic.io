# Handoff — Search

> **Entry**: `modal from header` · **Priority**: P1 · **Container**: `App.tsx`

## 1. Read BEFORE coding (mandatory)

- 📍 **State**: [`../../PROJECT-STATE.md`](../../PROJECT-STATE.md) — what exists, what is decided
- 🎨 **Artifact**: [`search.html`](../mockups/search.html) — the visual reference to match
- 💻 **Reference**: the existing implementation, `src/screens/SearchScreen.tsx` — match its conventions
- 📐 **Spec**: `docs/BRIEF.md`
- ⚠️ **Traps**: `docs/STACK.md` — check the APIs this unit uses
- 🛠️ **Skills**: `build-a-screen`, `musicapp-conventions`

## 2. Entry & files

- **Entry**: `modal from header`
- **Implementation**: `src/screens/SearchScreen.tsx`
- **Container**: `App.tsx`

## 3. Pieces — reuse first, create in the right layer if missing

**UI**

- track rows

## 4. States to cover

- query results over whole library
- empty hint

## 5. Watch-points

- shared by Home and Library headers

## 6. Definition of Done

- [ ] Matches the artifact `search.html`
- [ ] All states in §4 are handled
- [ ] strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21
- [ ] Reuses shared pieces — no duplicated ad-hoc code
- [ ] `npx tsc --noEmit && npx eslint .` passes
- [ ] `PROJECT-STATE.md` refreshed and INDEX status updated

## 7. Start prompt (paste to Claude Code)

```
Work on "Search" for MusicApp (modal from header). BEFORE coding, read: work/handoffs/search.md, the artifact work/mockups/search.html, the existing implementation in src/screens/SearchScreen.tsx, and the build-a-screen skill (+ musicapp-conventions). Follow the layered architecture (context -> src/lib + src/db -> native modules) (container App.tsx) and REUSE our shared pieces. strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21. Finish with: npx tsc --noEmit && npx eslint .. Then refresh PROJECT-STATE.md and set this unit's status in work/INDEX.md.
```

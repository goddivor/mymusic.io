# Handoff — Drive backup

> **Entry**: `account screen` · **Priority**: P1 · **Container**: `AccountScreen`

## 1. Read BEFORE coding (mandatory)

- 📍 **State**: [`../../PROJECT-STATE.md`](../../PROJECT-STATE.md) — what exists, what is decided
- 💻 **Reference**: the existing implementation, `src/lib/drive.ts` — match its conventions
- 📐 **Spec**: `docs/BRIEF.md`
- ⚠️ **Traps**: `docs/STACK.md` — check the APIs this unit uses
- 🛠️ **Skills**: `build-a-screen`, `musicapp-conventions`

## 2. Entry & files

- **Entry**: `account screen`
- **Implementation**: `src/lib/drive.ts`
- **Container**: `AccountScreen`

## 3. Pieces — reuse first, create in the right layer if missing

**UI**

- AccountScreen backup/restore actions
- AccountAvatar

**lib**

- drive (folder, list, resumable upload, restore)
- account (drive.file scope, access token)

## 4. States to cover

- backing up
- restoring
- nothing to do
- access refused
- offline
- no backup found

## 5. Watch-points

- drive.file scope, asked on first backup only
- Files keep their 'Title [videoId].ext' name so the scanner recognises them after a restore
- Restore republishes each missing file through MediaSaver, the same path as a fresh download

## 6. Definition of Done

- [ ] Consistent with the surrounding code
- [ ] All states in §4 are handled
- [ ] strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21
- [ ] Reuses shared pieces — no duplicated ad-hoc code
- [ ] `npx tsc --noEmit && npx eslint .` passes
- [ ] `PROJECT-STATE.md` refreshed and INDEX status updated

## 7. Start prompt (paste to Claude Code)

```
Work on "Drive backup" for MusicApp (account screen). BEFORE coding, read: work/handoffs/drive-backup.md, the existing implementation in src/lib/drive.ts, and the build-a-screen skill (+ musicapp-conventions). Follow the layered architecture (context -> src/lib + src/db -> native modules) (container AccountScreen) and REUSE our shared pieces. strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21. Finish with: npx tsc --noEmit && npx eslint .. Then refresh PROJECT-STATE.md and set this unit's status in work/INDEX.md.
```

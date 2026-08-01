# screen index — MusicApp

Each screen has a **handoff** (what to read, pieces, states, DoD, prompt).
Generated — edit `_generate-units.mjs`, not this file.
**The Status column is the exception**: it is hand-updated and preserved across regenerations.

> Before building: read the handoff, then follow the `build-a-screen` skill.

New work that is not listed here gets appended: add an object to the `UNITS` array and re-run the
generator. Nothing unit-sized should exist outside this table.

## screens

| Prio | screen | Entry | Links | Container | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | **Home** | `tab` | [handoff](./handoffs/home.md) | `App.tsx` | ✅ done |
| P0 | **Library** | `tab` | [handoff](./handoffs/library.md) | `App.tsx` | ✅ done |
| P0 | **YouTube (native tab)** | `tab` | [handoff](./handoffs/youtube.md) | `App.tsx` | ✅ done |
| P0 | **YouTube video page** | `modal from youtube` | [handoff](./handoffs/youtube-video.md) | `App.tsx` | ✅ done |
| P0 | **Now playing** | `modal` | [handoff](./handoffs/now-playing.md) | `App.tsx` | ✅ done |
| P1 | **Queue** | `modal` | [handoff](./handoffs/queue.md) | `App.tsx` | ✅ done |
| P1 | **Search** | `modal from header` | [handoff](./handoffs/search.md) | `App.tsx` | ✅ done |
| P2 | **Recents** | `modal from drawer` | [handoff](./handoffs/recents.md) | `App.tsx` | ✅ done |
| P1 | **Settings** | `modal from drawer` | [handoff](./handoffs/settings.md) | `App.tsx` | ✅ done |
| P1 | **Collection detail** | `modal` | [handoff](./handoffs/collection-detail.md) | `App.tsx` | ✅ done |
| P2 | **YouTube web fallback** | `modal from youtube` | [handoff](./handoffs/youtube-web.md) | `App.tsx` | ✅ done |
| P1 | **Listening stats** | `modal from drawer` | [handoff](./handoffs/listening-stats.md) | `App.tsx` | ⬜ todo |
| P2 | **Account connect** | `modal from drawer` | [handoff](./handoffs/account-connect.md) | `App.tsx` | ⬜ todo |
| P2 | **Player styles** | `modal from drawer` | [handoff](./handoffs/player-styles.md) | `App.tsx` | ⬜ todo |

Status vocabulary: `⬜ todo` · `🟡 in progress` · `✅ done`

## Suggested order

1. **P0** — Home · Library · YouTube (native tab) · YouTube video page · Now playing
2. **P1** — Queue · Search · Settings · Collection detail · Listening stats
3. **P2** — Recents · YouTube web fallback · Account connect · Player styles

## Regenerate

```bash
node work/_generate-units.mjs
```

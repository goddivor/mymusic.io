---
name: musicapp-conventions
description: Core conventions for MusicApp (offline-first Android music player — local library, native YouTube, LAN web player). READ BEFORE writing or editing any project code. Covers i18n, theming, persistence, native modules, comments, and the non-negotiable rules.
---

# MusicApp conventions

> Stack: **React Native 0.85 (New Architecture) · TypeScript · Android native modules · op-sqlite · Vite webapp**.
> All code and docs are in English. User-facing strings are fr/en via `t()`, never hardcoded.
> Specs: `docs/BRIEF.md`. Versions and traps: `docs/STACK.md`. Don't reinvent decisions made there.

## Non-negotiable rules

- **Comments**: English only, and only immediately BEFORE a genuinely complex function/class. Never
  inline, end-of-line, JSX (`{/* */}`), or section-divider comments. Directives (`eslint-disable`,
  `@format`, `@ts-ignore`) are kept.
- **User strings**: always `t('key')` from `src/i18n.ts`; add the key to BOTH `fr` and `en`. Never
  hardcode display text. Interpolate with `t('key', { x })`.
- **Styling**: `const styles = useThemedStyles(makeStyles)` + `useTheme()`; `makeStyles(theme)` at the
  bottom. NEVER import the mutable `theme` object into a component; colours come from the palette.
- **Persistence**: library data (tracks, playlists, folders, likes, play counts, recents) goes through
  `src/db/database.ts` (SQLite, `executeSync`). Settings (language, theme) use AsyncStorage in
  `src/store/settings.ts`. Do not add a third storage backend.
- **Downloads**: land in public `Music/MusicApp` via the `MediaSaver` native module; NEVER the cache dir.
- **Native modules**: one package dir per module under `com.musicapp/`, a `*Module.java` +
  `*Package.java`, registered in `MainApplication.kt`. New Architecture only — no removed Bridge APIs.
- **Android only**, JDK 21 to build. Never commit the webapp build or the release keystore.

## Architecture

UI (`App.tsx` → `src/screens` + `src/components`) reads the library from a single React context
(`src/store/library.tsx`), which is backed by SQLite (`src/db/database.ts`) and fed by native modules
via thin wrappers in `src/lib/` (`ytExtractor`, `scanMusic`, `webServer`, `updater`, `backup`). Audio
plays through `react-native-track-player` (`src/lib/player.ts`, `src/playbackService.js`).

## Naming and file layout

- One screen per file in `src/screens/`, one shared piece per file in `src/components/`.
- Non-UI logic in `src/lib/`; never inline a native call in a component — wrap it in `src/lib/`.
- Native module Java under `android/app/src/main/java/com/musicapp/<module>/`.

## Patterns to follow

```tsx
export default function SomeScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const lib = useLibrary();
  return <Text style={styles.title}>{t('recentlyAdded')}</Text>;
}
const makeStyles = (theme: Palette) => StyleSheet.create({ title: { color: theme.text } });
```

## Anti-patterns — never do this

- `<Text>Recently added</Text>` → use `t('recentlyAdded')`.
- `import { theme } from '../theme'` inside a component → use `useTheme()`.
- `AsyncStorage.setItem('playlists', …)` for library data → use `src/db/database.ts`.
- Saving a download under `RNFS.CachesDirectoryPath` → publish via `MediaSaver` to public storage.
- An end-of-line or JSX comment → move it before the function, or delete it.

## Definition of done

- [ ] `npx tsc --noEmit` passes
- [ ] `npx eslint .` passes (0 errors)
- [ ] If native code changed: APK builds with JDK 21, checked on a device
- [ ] `PROJECT-STATE.md` refreshed and `work/INDEX.md` status updated

## Related skills

- `build-a-screen` — the screen procedure.
- `context-protocol` — keeping the context files small and honest.
- `/commit` — the commit workflow.

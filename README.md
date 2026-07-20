# MusicApp

Lecteur de musique locale (Android) avec téléchargement audio depuis YouTube,
**100 % embarqué — aucun serveur**.

## Ce que ça fait

- **Bibliothèque** : scanne tes fichiers audio dans `Music/` et `Download/` et les
  joue (mp3, m4a, aac, wav, flac, ogg, opus, wma). Lecture en arrière-plan avec
  contrôles dans la barre de notification.
- **YouTube** : une WebView pour naviguer sur YouTube. Quand tu ouvres une vidéo,
  un bouton **« Télécharger en audio »** apparaît. L'audio est extrait sur le
  téléphone via [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor),
  téléchargé localement, et ajouté à la playlist **Youtube** — écoutable hors-ligne.

## Architecture

| Couche | Techno |
|--------|--------|
| Lecture audio | `react-native-track-player` |
| Navigation YouTube | `react-native-webview` |
| Scan / download fichiers | `react-native-fs` |
| Playlist Youtube (persistée) | `@react-native-async-storage/async-storage` |
| Extraction YouTube → audio | Module natif Android `YtExtractor` (Java) autour de NewPipeExtractor |

Le module natif est dans
`android/app/src/main/java/com/musicapp/ytextractor/` :
- `DownloaderImpl.java` — client HTTP (OkHttp) requis par NewPipeExtractor
- `YtExtractorModule.java` — expose `getAudioStream(url)` à JS
- `YtExtractorPackage.java` — enregistrement du module

Le JS appelle `getAudioStream(url)` → reçoit l'URL du meilleur flux audio →
télécharge le fichier avec `react-native-fs` → l'ajoute à la playlist.

## Lancer en dev

```bash
# 1. Démarrer Metro
npm start

# 2. Sur un autre terminal, installer sur un appareil/émulateur Android branché
npm run android
```

> Sur Linux, seul Android est buildable (iOS nécessite un Mac).

## Builder l'APK

```bash
cd android && ./gradlew :app:assembleDebug
# APK -> android/app/build/outputs/apk/debug/app-debug.apk
```

## Permissions

Demandées au runtime : accès aux fichiers audio (`READ_MEDIA_AUDIO` sur Android 13+),
notifications, et service de premier plan pour la lecture en arrière-plan.

## Extraction YouTube : comment ça marche réellement

YouTube exige désormais un *poToken* pour les flux **audio-only** adaptatifs ;
sans lui, NewPipeExtractor renvoie une liste audio vide. On contourne ça sans
serveur ni poToken en retombant sur le flux **progressif muxé** (vidéo+audio,
généralement 360p / AAC ~96 kbps) : on télécharge ce mp4 et le lecteur n'en
joue que la piste audio. Qualité largement suffisante pour écouter ; fichier un
peu plus gros qu'un vrai audio-only. Le code essaie d'abord un vrai flux audio
(`getAudioStreams`) et bascule sur le muxé seulement si nécessaire
(`YtExtractorModule.java`).

Si l'extraction casse un jour, bumpe la version dans `android/app/build.gradle`
(`com.github.TeamNewPipe:NewPipeExtractor:vX.Y.Z`). Pour diagnostiquer vite sans
rebuild l'APK, `scripts/NpeTest.java` teste l'extraction directement en JVM.

## Patches react-native-track-player

RNTP 4.1.2 n'est pas compatible out-of-the-box avec RN 0.85 (Nouvelle
Architecture obligatoire + Android 16). Quatre correctifs sont figés via
`patch-package` (`patches/react-native-track-player+4.1.2.patch`, réappliqués au
`postinstall`) :

1. **Bundle null-safety** — `Arguments.fromBundle(originalItem ?: Bundle())`.
2. **TurboModule** — méthodes `@ReactMethod` réécrites en block-body (retour
   `Unit` au lieu de `Job`), sinon « returnType == void iff synchronous ».
3. **Foreground service** — `startForeground` enrobé d'un try/catch (crash
   `ForegroundServiceStartNotAllowedException` sur Android 12+).
4. **Bridgeless emit** — events envoyés via `reactHost.currentReactContext` au
   lieu de `reactNativeHost.reactInstanceManager` (interdit en New Architecture).

Le script `scripts/fix-trackplayer-newarch.py` régénère le correctif #2 si besoin.

Usage strictement personnel — respecte les conditions d'utilisation de YouTube.

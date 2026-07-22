import { useSyncExternalStore } from 'react';

export type Lang = 'fr' | 'en';

const fr = {
  tabHome: 'Accueil',
  tabLibrary: 'Bibliothèque',
  tabYoutube: 'YouTube',
  back: 'Retour',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  comingSoon: 'Bientôt disponible',

  guest: 'Invité',
  notConnected: 'Non connecté',
  signIn: 'Se connecter',
  recents: 'Récents',
  settings: 'Réglages',
  playerStyles: 'Styles du lecteur',
  listeningStats: "Statistiques d'écoute",

  webAccessTitle: 'Écouter sur le web',
  webAccessSub: 'Diffuse sur le même Wi-Fi.',
  webAccessUnavailable: 'Module serveur indisponible (rebuild requis)',
  webAccessError: 'Erreur serveur',
  preventSleep: 'Empêcher la mise en veille',

  sectionGeneral: 'GÉNÉRAL',
  language: 'Langue',
  themeLabel: 'Thème',
  system: 'Système',
  french: 'Français',
  english: 'English',
  darkTheme: 'Sombre',
  lightTheme: 'Clair',
  sectionPlayback: 'LECTURE',
  audioQuality: 'Qualité audio',
  audioQualitySub: 'Audio-only haute qualité, repli auto.',
  sectionAbout: 'À PROPOS',
  aboutTitle: 'Ta musique, à toi.',
  aboutSub: 'Local + YouTube · v{v}',
  updateAvailable: 'Mise à jour {v} disponible',
  updateNotes: 'Notes de version',
  updateNow: 'Mettre à jour',
  updateLater: 'Plus tard',
  updateDownloading: 'Téléchargement… {pct}%',
  updateInstalling: "Ouverture de l'installateur…",
  updateError: 'Échec de la mise à jour. Réessaie.',
  checkUpdates: 'Vérifier les mises à jour',
  upToDate: 'Application à jour (v{v})',
  githubRepo: 'Code source',
  githubRepoSub: 'github.com/goddivor/mymusic.io',

  recentlyAdded: 'Récemment ajouté',
  yourLocalLibrary: 'Ta bibliothèque locale',
  showAll: 'Tout afficher',
  downloadFromYoutubeHint: "Télécharge depuis l'onglet YouTube",
  noAudioFound: 'Aucun fichier audio trouvé',

  play: 'Jouer',
  like: 'Liker',
  unlike: 'Retirer des likes',
  playNext: 'Lire ensuite',
  addToPlaylist: 'Ajouter à une playlist',

  searchPlaceholder: 'Titre, artiste, album…',
  searchHint: 'Cherche dans toute ta bibliothèque.',
  noResults: 'Aucun résultat.',
  search: 'Rechercher',
  searchIn: 'Rechercher dans « {name} »',

  noRecentPlays: 'Aucune écoute récente.',

  settingsSearchPlaceholder: 'Rechercher un réglage',
  settingsSearchTitle: 'Que cherches-tu ?',
  settingsSearchSub: 'Cherche un réglage précis ou utilise quelques mots-clés.',

  filterAll: 'Tout',
  filterAlbums: 'Albums',
  filterPlaylists: 'Playlists',
  filterYoutube: 'Youtube',
  filterLocal: 'Local',
  playPlaylist: 'Jouer la playlist',
  deletePlaylist: 'Supprimer la playlist',
  deletePlaylistQ: 'Supprimer la playlist ?',
  deletePlaylistMsg: '« {name} » sera définitivement supprimée.',
  delete: 'Supprimer',
  playAlbum: "Jouer l'album",
  deleteAlbum: "Supprimer l'album",
  deleteAlbumQ: "Supprimer l'album ?",
  deleteAlbumMsg: '« {name} » et ses titres téléchargés seront supprimés.',
  newPlaylist: 'Nouvelle playlist',
  playlistName: 'Nom de la playlist',
  create: 'Créer',
  newFolder: 'Nouveau dossier',
  folderName: 'Nom du dossier',
  folder: 'Dossier',
  moveToFolder: 'Déplacer vers un dossier',
  removeFromFolder: 'Retirer du dossier',
  deleteFolder: 'Supprimer le dossier',
  deleteFolderQ: 'Supprimer le dossier ?',
  deleteFolderMsg: '« {name} » sera supprimé, ses playlists seront conservées.',
  folderEmpty: 'Dossier vide. Déplace des playlists ici via ⋯.',

  likedTracks: 'Titres likés',
  autoPlaylist: 'Playlist auto',
  album: 'Album',
  playlist: 'Playlist',
  youtubeCollection: 'Youtube',
  downloadsSub: 'Téléchargements',
  myMusic: 'Ma musique',
  localFiles: 'Fichiers locaux',

  removeDownload: 'Supprimer le téléchargement',
  removeDownloadQ: 'Supprimer le téléchargement ?',
  removeDownloadMsg: "« {name} » sera supprimé de l'appareil.",
  removeFromPlaylist: 'Retirer de la playlist',
  removeFromPlaylistQ: 'Retirer de la playlist ?',
  removeFromPlaylistMsg: '« {track} » sera retiré de « {collection} ».',
  remove: 'Retirer',
  emptyLiked: 'Aucun titre liké pour l’instant.',
  emptyYoutube: 'Aucun téléchargement. Va dans l’onglet YouTube.',
  emptyPlaylist: 'Playlist vide. Ajoute des titres via ⋯.',
  emptyLocal: 'Aucun fichier audio trouvé.',

  nowPlaying: 'EN LECTURE',
  upNext: 'À SUIVRE',
  share: 'Partager',
  queue: "File d'attente",
  inTheGenre: 'Dans le genre',
  queueEmpty: "Rien d'autre dans la file.",
  track: 'Titre',
  listeningTo: "J'écoute « {title} » — {artist}",
  iListen: "J'ÉCOUTE",

  noConnection: 'Pas de connexion',
  noConnectionMsg: 'Vérifie ton réseau pour parcourir et télécharger depuis YouTube.',
  retry: 'Réessayer',
  preparing: 'Préparation…',
  downloadAlbum: "Télécharger l'album",
  downloadPlaylist: 'Télécharger la playlist',
  downloadAudio: 'Télécharger en audio',
  collectionQueued: '{kind} « {title} » — {n} titres en téléchargement{capped}',
  cantFetchList: 'Impossible de récupérer la liste',
  trending: 'Tendances',
  searchYoutube: 'Rechercher sur YouTube',
  viewsCount: '{n} vues',
  listen: 'Écouter',
  video: 'Vidéo',
  download: 'Télécharger',
  relatedVideos: 'Suggestions',
  comments: 'Commentaires',
  noComments: 'Aucun commentaire.',
  webVersion: 'Version web',
  loadError: 'Chargement impossible. Vérifie ta connexion.',
  loadMore: 'Charger plus',

  downloads: 'Téléchargements',
  clearFinished: 'Effacer terminés',
  extracting: 'Extraction…',
  downloadingPct: 'Téléchargement {pct}%',
  done: 'Terminé',
  error: 'Erreur',
  noDownloads: 'Aucun téléchargement',
  downloadFailed: 'Échec du téléchargement',

  addTrackTitle: 'Ajouter « {title} »',
  alreadyAddedRemove: 'Déjà ajouté — retirer',
  addToLikes: 'Ajouter aux likes',

  invalidYoutubeUrl: 'URL YouTube invalide',
  downloadHttpError: 'Téléchargement échoué (HTTP {code})',
};

const en: Record<keyof typeof fr, string> = {
  tabHome: 'Home',
  tabLibrary: 'Library',
  tabYoutube: 'YouTube',
  back: 'Back',
  cancel: 'Cancel',
  confirm: 'Confirm',
  comingSoon: 'Coming soon',

  guest: 'Guest',
  notConnected: 'Not signed in',
  signIn: 'Sign in',
  recents: 'Recents',
  settings: 'Settings',
  playerStyles: 'Player styles',
  listeningStats: 'Listening stats',

  webAccessTitle: 'Listen on the web',
  webAccessSub: 'Stream over the same Wi-Fi.',
  webAccessUnavailable: 'Server module unavailable (rebuild required)',
  webAccessError: 'Server error',
  preventSleep: 'Prevent sleep',

  sectionGeneral: 'GENERAL',
  language: 'Language',
  themeLabel: 'Theme',
  system: 'System',
  french: 'Français',
  english: 'English',
  darkTheme: 'Dark',
  lightTheme: 'Light',
  sectionPlayback: 'PLAYBACK',
  audioQuality: 'Audio quality',
  audioQualitySub: 'High-quality audio-only, auto fallback.',
  sectionAbout: 'ABOUT',
  aboutTitle: 'Your music, yours.',
  aboutSub: 'Local + YouTube · v{v}',
  updateAvailable: 'Update {v} available',
  updateNotes: "What's new",
  updateNow: 'Update now',
  updateLater: 'Later',
  updateDownloading: 'Downloading… {pct}%',
  updateInstalling: 'Opening installer…',
  updateError: 'Update failed. Try again.',
  checkUpdates: 'Check for updates',
  upToDate: 'App is up to date (v{v})',
  githubRepo: 'Source code',
  githubRepoSub: 'github.com/goddivor/mymusic.io',

  recentlyAdded: 'Recently added',
  yourLocalLibrary: 'Your local library',
  showAll: 'Show all',
  downloadFromYoutubeHint: 'Download from the YouTube tab',
  noAudioFound: 'No audio file found',

  play: 'Play',
  like: 'Like',
  unlike: 'Remove from likes',
  playNext: 'Play next',
  addToPlaylist: 'Add to a playlist',

  searchPlaceholder: 'Title, artist, album…',
  searchHint: 'Search your whole library.',
  noResults: 'No results.',
  search: 'Search',
  searchIn: 'Search in “{name}”',

  noRecentPlays: 'No recent plays.',

  settingsSearchPlaceholder: 'Search for a setting',
  settingsSearchTitle: 'What are you looking for?',
  settingsSearchSub: 'Search for a specific setting or use a few keywords.',

  filterAll: 'All',
  filterAlbums: 'Albums',
  filterPlaylists: 'Playlists',
  filterYoutube: 'Youtube',
  filterLocal: 'Local',
  playPlaylist: 'Play playlist',
  deletePlaylist: 'Delete playlist',
  deletePlaylistQ: 'Delete this playlist?',
  deletePlaylistMsg: '“{name}” will be permanently deleted.',
  delete: 'Delete',
  playAlbum: 'Play album',
  deleteAlbum: 'Delete album',
  deleteAlbumQ: 'Delete this album?',
  deleteAlbumMsg: '“{name}” and its downloaded tracks will be deleted.',
  newPlaylist: 'New playlist',
  playlistName: 'Playlist name',
  create: 'Create',
  newFolder: 'New folder',
  folderName: 'Folder name',
  folder: 'Folder',
  moveToFolder: 'Move to a folder',
  removeFromFolder: 'Remove from folder',
  deleteFolder: 'Delete folder',
  deleteFolderQ: 'Delete this folder?',
  deleteFolderMsg: '“{name}” will be deleted; its playlists will be kept.',
  folderEmpty: 'Empty folder. Move playlists here via ⋯.',

  likedTracks: 'Liked tracks',
  autoPlaylist: 'Auto playlist',
  album: 'Album',
  playlist: 'Playlist',
  youtubeCollection: 'Youtube',
  downloadsSub: 'Downloads',
  myMusic: 'My music',
  localFiles: 'Local files',

  removeDownload: 'Delete download',
  removeDownloadQ: 'Delete this download?',
  removeDownloadMsg: '“{name}” will be removed from the device.',
  removeFromPlaylist: 'Remove from playlist',
  removeFromPlaylistQ: 'Remove from playlist?',
  removeFromPlaylistMsg: '“{track}” will be removed from “{collection}”.',
  remove: 'Remove',
  emptyLiked: 'No liked tracks yet.',
  emptyYoutube: 'No downloads. Check the YouTube tab.',
  emptyPlaylist: 'Empty playlist. Add tracks via ⋯.',
  emptyLocal: 'No audio file found.',

  nowPlaying: 'NOW PLAYING',
  upNext: 'UP NEXT',
  share: 'Share',
  queue: 'Queue',
  inTheGenre: 'More like this',
  queueEmpty: 'Nothing else in the queue.',
  track: 'Track',
  listeningTo: 'Listening to “{title}” — {artist}',
  iListen: 'LISTENING TO',

  noConnection: 'No connection',
  noConnectionMsg: 'Check your network to browse and download from YouTube.',
  retry: 'Retry',
  preparing: 'Preparing…',
  downloadAlbum: 'Download album',
  downloadPlaylist: 'Download playlist',
  downloadAudio: 'Download as audio',
  collectionQueued: '{kind} “{title}” — {n} tracks downloading{capped}',
  cantFetchList: 'Could not fetch the list',
  trending: 'Trending',
  searchYoutube: 'Search YouTube',
  viewsCount: '{n} views',
  listen: 'Play',
  video: 'Video',
  download: 'Download',
  relatedVideos: 'Related',
  comments: 'Comments',
  noComments: 'No comments.',
  webVersion: 'Web version',
  loadError: 'Could not load. Check your connection.',
  loadMore: 'Load more',

  downloads: 'Downloads',
  clearFinished: 'Clear finished',
  extracting: 'Extracting…',
  downloadingPct: 'Downloading {pct}%',
  done: 'Done',
  error: 'Error',
  noDownloads: 'No downloads',
  downloadFailed: 'Download failed',

  addTrackTitle: 'Add “{title}”',
  alreadyAddedRemove: 'Already added — remove',
  addToLikes: 'Add to likes',

  invalidYoutubeUrl: 'Invalid YouTube URL',
  downloadHttpError: 'Download failed (HTTP {code})',
};

const dicts: Record<Lang, Record<keyof typeof fr, string>> = { fr, en };

export type I18nKey = keyof typeof fr;

let currentLang: Lang = 'fr';
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  listeners.forEach(fn => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key: I18nKey, params?: Record<string, string | number>): string {
  let str = dicts[currentLang][key] ?? fr[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.split(`{${k}}`).join(String(v));
    }
  }
  return str;
}

export function tracksCount(n: number): string {
  const s = n > 1 ? 's' : '';
  return currentLang === 'fr' ? `${n} titre${s}` : `${n} track${s}`;
}

export function playlistsCount(n: number): string {
  const s = n > 1 ? 's' : '';
  return `${n} playlist${s}`;
}

/**
 * Subscribes the component to language changes: any component that renders
 * text must call this hook so it re-renders when the language changes.
 */
export function useI18n(): {
  t: typeof t;
  lang: Lang;
  tracksCount: typeof tracksCount;
  playlistsCount: typeof playlistsCount;
} {
  useSyncExternalStore(subscribe, getLang);
  return { t, lang: currentLang, tracksCount, playlistsCount };
}

import {
  AlbumIcon,
  FavouriteIcon,
  MusicNote01Icon,
  Playlist03Icon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons';
import { Gradient, gradients, playlistGradient } from '../theme';
import { AppTrack } from '../types';

export type CollectionKind = 'liked' | 'youtube' | 'local' | 'playlist' | 'album';

export type Collection = {
  key: string;
  title: string;
  subtitle: string;
  kind: CollectionKind;
  tracks: AppTrack[];
  gradient: Gradient;
  icon: any;
  cover?: string; // album cover image (overrides the gradient tile)
  numbered?: boolean; // show track numbers instead of artwork (albums)
  playlistId?: string;
};

type LibLike = {
  likedTracks: AppTrack[];
  youtubeTracks: AppTrack[];
  localTracks: AppTrack[];
  playlists: { id: string; name: string; trackIds: string[] }[];
  playlistTracks: (p: { id: string; name: string; trackIds: string[] }) => AppTrack[];
};

function plural(n: number): string {
  return `${n} titre${n > 1 ? 's' : ''}`;
}

export function buildCollections(lib: LibLike): Collection[] {
  const liked: Collection = {
    key: 'liked',
    title: 'Titres likés',
    subtitle: `Playlist auto · ${plural(lib.likedTracks.length)}`,
    kind: 'liked',
    tracks: lib.likedTracks,
    gradient: gradients.liked,
    icon: FavouriteIcon,
  };

  // Group downloaded album tracks by albumId into Album collections.
  const albumsMap = new Map<string, AppTrack[]>();
  for (const t of lib.youtubeTracks) {
    if (t.albumId) {
      const arr = albumsMap.get(t.albumId) ?? [];
      arr.push(t);
      albumsMap.set(t.albumId, arr);
    }
  }
  const albumCollections: Collection[] = Array.from(albumsMap.entries()).map(
    ([albumId, tracks]) => {
      const sorted = [...tracks].sort(
        (a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
      );
      const first = sorted[0];
      return {
        key: 'album:' + albumId,
        title: first.album ?? 'Album',
        subtitle: `Album · ${first.albumArtist ?? first.artist}`,
        kind: 'album' as const,
        tracks: sorted,
        gradient: playlistGradient(albumId),
        icon: AlbumIcon,
        cover: first.albumCover,
        numbered: true,
      };
    },
  );

  const playlistCollections: Collection[] = lib.playlists.map(p => ({
    key: p.id,
    title: p.name,
    subtitle: `Playlist · ${plural(p.trackIds.length)}`,
    kind: 'playlist' as const,
    tracks: lib.playlistTracks(p),
    gradient: playlistGradient(p.id + p.name),
    icon: Playlist03Icon,
    playlistId: p.id,
  }));

  const youtube: Collection = {
    key: 'youtube',
    title: 'Youtube',
    subtitle: `Téléchargements · ${plural(lib.youtubeTracks.length)}`,
    kind: 'youtube',
    tracks: lib.youtubeTracks,
    gradient: gradients.youtube,
    icon: YoutubeIcon,
  };

  const local: Collection = {
    key: 'local',
    title: 'Ma musique',
    subtitle: `Fichiers locaux · ${plural(lib.localTracks.length)}`,
    kind: 'local',
    tracks: lib.localTracks,
    gradient: gradients.local,
    icon: MusicNote01Icon,
  };

  return [liked, youtube, local, ...albumCollections, ...playlistCollections];
}

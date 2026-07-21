import {
  AlbumIcon,
  FavouriteIcon,
  MusicNote01Icon,
  Playlist03Icon,
} from '@hugeicons/core-free-icons';
import BrandYoutubeIcon from '../components/BrandYoutubeIcon';
import { t, tracksCount } from '../i18n';
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
  cover?: string;
  numbered?: boolean;
  playlistId?: string;
};

type LibLike = {
  likedTracks: AppTrack[];
  youtubeTracks: AppTrack[];
  localTracks: AppTrack[];
  playlists: { id: string; name: string; trackIds: string[] }[];
  playlistTracks: (p: { id: string; name: string; trackIds: string[] }) => AppTrack[];
};

export function buildCollections(lib: LibLike): Collection[] {
  const liked: Collection = {
    key: 'liked',
    title: t('likedTracks'),
    subtitle: `${t('autoPlaylist')} · ${tracksCount(lib.likedTracks.length)}`,
    kind: 'liked',
    tracks: lib.likedTracks,
    gradient: gradients.liked,
    icon: FavouriteIcon,
  };

  const albumsMap = new Map<string, AppTrack[]>();
  for (const t of [...lib.youtubeTracks, ...lib.localTracks]) {
    if (t.albumId) {
      const arr = albumsMap.get(t.albumId) ?? [];
      arr.push(t);
      albumsMap.set(t.albumId, arr);
    }
  }
  for (const [albumId, tracks] of albumsMap) {
    if (!albumId.startsWith('mslocal:')) continue;
    const tagged = tracks.some(t => t.trackNumber || t.albumArtist);
    if (tracks.length < 2 || !tagged) albumsMap.delete(albumId);
  }
  const albumCollections: Collection[] = Array.from(albumsMap.entries()).map(
    ([albumId, tracks]) => {
      const sorted = [...tracks].sort(
        (a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
      );
      const first = sorted[0];
      return {
        key: 'album:' + albumId,
        title: first.album ?? t('album'),
        subtitle: `${t('album')} · ${first.albumArtist ?? first.artist}`,
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
    subtitle: `${t('playlist')} · ${tracksCount(p.trackIds.length)}`,
    kind: 'playlist' as const,
    tracks: lib.playlistTracks(p),
    gradient: playlistGradient(p.id + p.name),
    icon: Playlist03Icon,
    playlistId: p.id,
  }));

  const youtube: Collection = {
    key: 'youtube',
    title: t('youtubeCollection'),
    subtitle: `${t('downloadsSub')} · ${tracksCount(lib.youtubeTracks.length)}`,
    kind: 'youtube',
    tracks: lib.youtubeTracks,
    gradient: gradients.youtube,
    icon: BrandYoutubeIcon,
  };

  const local: Collection = {
    key: 'local',
    title: t('myMusic'),
    subtitle: `${t('localFiles')} · ${tracksCount(lib.localTracks.length)}`,
    kind: 'local',
    tracks: lib.localTracks,
    gradient: gradients.local,
    icon: MusicNote01Icon,
  };

  return [liked, youtube, local, ...albumCollections, ...playlistCollections];
}

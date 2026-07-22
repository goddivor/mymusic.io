export type AppTrack = {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  source: 'local' | 'youtube';
  albumId?: string;
  album?: string;
  albumArtist?: string;
  albumCover?: string;
  trackNumber?: number;
};

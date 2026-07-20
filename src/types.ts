export type AppTrack = {
  id: string;
  url: string; // file:// path (local file or downloaded youtube audio)
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  source: 'local' | 'youtube';
  // Album grouping (set when downloaded as part of a YouTube Music album)
  albumId?: string;
  album?: string;
  albumArtist?: string;
  albumCover?: string;
  trackNumber?: number;
};

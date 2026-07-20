import { useEffect } from 'react';
import { buildSnapshot, WebServer } from '../lib/webServer';
import { useLibrary } from '../store/library';

/**
 * Pushes a fresh library snapshot to the native web server whenever the library
 * changes. The native side no-ops when the server isn't running, so this is
 * safe to mount unconditionally.
 */
export default function WebServerSync() {
  const lib = useLibrary();

  useEffect(() => {
    WebServer.updateLibrary(buildSnapshot(lib));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib.youtubeTracks, lib.localTracks, lib.playlists, lib.likedIds]);

  return null;
}

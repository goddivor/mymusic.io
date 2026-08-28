import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  FavouriteIcon,
  Home09Icon,
  LibraryIcon,
  MusicNote01Icon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  RepeatIcon,
  RepeatOneIcon,
  ComputerIcon,
  Search01Icon,
  ShuffleIcon,
  SmartPhone01Icon,
  VolumeHighIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const Icon = ({
  icon,
  size = 20,
  color = 'currentColor',
  sw = 1.8,
}: {
  icon: any;
  size?: number;
  color?: string;
  sw?: number;
}) => <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={sw} />;

const Bars = () => (
  <span className="eq" aria-hidden="true">
    <i />
    <i />
    <i />
    <i />
  </span>
);

/** Album art with a music-note fallback when the src is missing or 404s (no real cover). */
const Art = ({ src, size }: { src?: string; size: number }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <Icon icon={MusicNote01Icon} size={size} color="#8a7fa0" />;
  return <img src={src} alt="" onError={() => setFailed(true)} />;
};

const API = window.location.origin;
const TOKEN_KEY = 'mp_token';

type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumId?: string;
  albumCover?: string;
  artwork?: string;
  trackNumber?: number;
  duration?: number;
  source?: string;
};
type Playlist = { id: string; name: string; trackIds: string[] };
type Lib = { tracks: Track[]; playlists: Playlist[]; likedIds: string[] };
type Collection = { key: string; name: string; sub: string; tracks: Track[] };
type RepeatMode = 'off' | 'all' | 'one';
type PhoneState = {
  output: 'phone' | 'web';
  playing: boolean;
  position: number;
  duration: number;
  index: number;
  seekNonce: number;
  seekTo: number;
  track: { id: string; title: string; artist: string; artwork?: string } | null;
};

const trackUrl = (id: string, token: string) =>
  `${API}/track/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;

const artUrl = (raw: string | undefined, id: string, token: string) => {
  if (!raw) return undefined;
  if (raw.startsWith('content://') || raw.startsWith('file://'))
    return `${API}/art/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
  return raw;
};

const cover = (t?: Track) => t?.artwork || t?.albumCover || '';
const colCover = (c?: Collection) => {
  const t = c?.tracks.find(x => cover(x));
  return t ? cover(t) : '';
};

const GRADS = [
  ['#8B5CF6', '#EC4899'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#3B82F6'],
  ['#22D3EE', '#6366F1'],
  ['#FB7185', '#A855F7'],
  ['#FF512F', '#DD2476'],
  ['#0EA5E9', '#6366F1'],
];
function grad(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const g = GRADS[h % GRADS.length];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}
function fmt(s: number) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function TrackRow({
  t,
  isCur,
  playing,
  liked,
  onPlay,
}: {
  t: Track;
  isCur: boolean;
  playing: boolean;
  liked: boolean;
  onPlay: () => void;
}) {
  return (
    <div className={'qrow' + (isCur ? ' cur' : '')} onClick={onPlay}>
      <div className="qthumb">
        <Art src={cover(t)} size={20} />
        <div className="qov">
          {isCur && playing ? (
            <Bars />
          ) : (
            <Icon icon={isCur ? PauseIcon : PlayIcon} size={16} color="#fff" sw={2} />
          )}
        </div>
      </div>
      <div className="qmeta">
        <div className="qtitle">
          {t.title}{' '}
          {liked && (
            <span className="heart">
              <Icon icon={FavouriteIcon} size={12} color="#ff6fb5" sw={2.4} />
            </span>
          )}
        </div>
        <div className="qsub">{t.artist}</div>
      </div>
      <div className="qdur">{fmt(t.duration ?? 0)}</div>
    </div>
  );
}

function BigCard({ c, onOpen, onPlay }: { c: Collection; onOpen: () => void; onPlay: () => void }) {
  const cc = colCover(c);
  return (
    <div className="bcard" onClick={onOpen}>
      <div className="bcover" style={cc ? undefined : { background: grad(c.name) }}>
        <Art src={cc} size={46} />
        <button
          className="bplay"
          onClick={e => {
            e.stopPropagation();
            onPlay();
          }}>
          <Icon icon={PlayIcon} size={16} color="#1a1020" sw={2.2} />
        </button>
      </div>
      <div className="bname">{c.name}</div>
      <div className="bsub">{c.sub} · {c.tracks.length} titres</div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [lib, setLib] = useState<Lib | null>(null);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [view, setView] = useState<string>('home');
  const [search, setSearch] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<number[]>([]);
  const [queue] = useState<Track[]>([]);
  const [queueName, setQueueName] = useState('File d\'attente');
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [phone, setPhone] = useState<PhoneState | null>(null);
  const [npOpen, setNpOpen] = useState(false);
  const [npTab, setNpTab] = useState<'next' | 'lyrics' | 'related'>('next');

  const current = index >= 0 ? queue[index] : undefined;

  useEffect(() => {
    if (token) loadLib(token);
    else setAuthNeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLib(tk: string) {
    try {
      const res = await fetch(`${API}/library?t=${encodeURIComponent(tk)}`);
      if (res.status === 403) return setAuthNeeded(true);
      const data: Lib = await res.json();
      const tracks = data.tracks.map(t => ({
        ...t,
        artwork: artUrl(t.artwork, t.id, tk),
        albumCover: artUrl(t.albumCover, t.id, tk),
      }));
      setLib({ ...data, tracks });
      setAuthNeeded(false);
    } catch {
      setAuthNeeded(true);
    }
  }

  async function pair(pin: string) {
    const res = await fetch(`${API}/pair?pin=${encodeURIComponent(pin)}`, { method: 'POST' });
    if (!res.ok) throw new Error('PIN invalide');
    const { token: tk } = await res.json();
    localStorage.setItem(TOKEN_KEY, tk);
    setToken(tk);
    await loadLib(tk);
  }

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`${API}/state?t=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data: PhoneState = await res.json();
        if (alive && data && typeof data.output === 'string') setPhone(data);
      } catch {}
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [token]);

  const sendCommand = (action: string, value?: string) => {
    if (!token) return;
    const q = new URLSearchParams({ t: token, action });
    if (value !== undefined) q.set('value', value);
    fetch(`${API}/command?${q.toString()}`, { method: 'POST' }).catch(() => {});
  };

  const onWeb = phone?.output === 'web';
  const remote = !onWeb;

  const byId = useMemo(() => {
    const m = new Map<string, Track>();
    lib?.tracks.forEach(t => m.set(t.id, t));
    return m;
  }, [lib]);

  const collections: Collection[] = useMemo(() => {
    if (!lib) return [];
    const all = lib.tracks;
    const likedTracks = lib.likedIds.map(id => byId.get(id)).filter(Boolean) as Track[];
    const albumsMap = new Map<string, Track[]>();
    for (const t of all) {
      if (t.albumId) {
        const arr = albumsMap.get(t.albumId) ?? [];
        arr.push(t);
        albumsMap.set(t.albumId, arr);
      }
    }
    const albums: Collection[] = [...albumsMap.entries()].map(([id, tracks]) => {
      const sorted = [...tracks].sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
      return { key: 'album:' + id, name: sorted[0].album ?? 'Album', sub: 'Album', tracks: sorted };
    });
    const playlists: Collection[] = lib.playlists.map(p => ({
      key: p.id,
      name: p.name,
      sub: 'Playlist',
      tracks: p.trackIds.map(id => byId.get(id)).filter(Boolean) as Track[],
    }));
    return [
      { key: 'all', name: 'Tous les titres', sub: 'Bibliothèque', tracks: all },
      { key: 'liked', name: 'Titres likés', sub: 'Auto-playlist', tracks: likedTracks },
      ...albums,
      ...playlists,
    ];
  }, [lib, byId]);

  const colByKey = (k: string) => collections.find(c => c.key === k);
  const allTracks = lib?.tracks ?? [];

  function playFrom(list: Track[], i: number, ctx = 'File d\'attente') {
    setQueueName(ctx);
    sendCommand('playId', list[i]?.id);
  }

  const goTo = (i: number) => {
    if (index >= 0) historyRef.current.push(index);
    setIndex(i);
  };

  function pickNext(): number {
    if (queue.length === 0) return -1;
    if (shuffle && queue.length > 1) {
      let r = index;
      while (r === index) r = Math.floor(Math.random() * queue.length);
      return r;
    }
    if (index < queue.length - 1) return index + 1;
    if (repeat === 'all') return 0;
    return -1;
  }

  const onEnded = () => {
    if (onWeb) {
      sendCommand('next');
      return;
    }
    if (repeat === 'one') {
      const a = audioRef.current;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
      return;
    }
    const n = pickNext();
    if (n >= 0) goTo(n);
    else setPlaying(false);
  };
  const cycleRepeat = () =>
    setRepeat(r => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  const isLiked = (id: string) => lib?.likedIds.includes(id);

  const phoneTrackId = phone?.track?.id;
  const seekNonceRef = useRef(-1);
  // The <audio> element only mounts once the library renders, so effects that
  // touch it must re-run then — otherwise a state that arrived first is lost.
  const audioMounted = !!lib && !authNeeded;

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !onWeb || !phoneTrackId || !token) return;
    const src = trackUrl(phoneTrackId, token);
    if (a.src !== src) {
      a.src = src;
      a.currentTime = phone?.position ?? 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onWeb, phoneTrackId, token, audioMounted]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    // Handing the audio back to the phone must silence the browser, otherwise
    // both devices play the same track at once.
    if (!onWeb) {
      a.pause();
      return;
    }
    if (phone?.playing) a.play().catch(() => {});
    else a.pause();
  }, [onWeb, phone?.playing, phoneTrackId, audioMounted]);


  useEffect(() => {
    const a = audioRef.current;
    if (!a || !onWeb || !phone) return;
    if (phone.seekNonce !== undefined && phone.seekNonce !== seekNonceRef.current) {
      seekNonceRef.current = phone.seekNonce;
      if (phone.seekNonce >= 0) a.currentTime = phone.seekTo ?? 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onWeb, phone?.seekNonce]);

  useEffect(() => {
    if (!onWeb) return;
    const timer = setInterval(() => {
      const a = audioRef.current;
      if (a && !a.paused) sendCommand('webpos', String(a.currentTime));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onWeb, token]);


  if (authNeeded) return <Pairing onPair={pair} />;
  if (!lib) return <div className="center muted">Chargement…</div>;

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? allTracks.filter(
        t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
      )
    : [];

  const rTrack = phone?.track;
  const shown = rTrack
    ? {
        id: rTrack.id,
        title: rTrack.title,
        artist: rTrack.artist,
        artwork: token ? artUrl(rTrack.artwork, rTrack.id, token) : undefined,
      }
    : current;
  const shownPos = onWeb ? pos : phone?.position ?? 0;
  const shownDur = onWeb ? dur || phone?.duration || 0 : phone?.duration ?? 0;
  const shownPlaying = !!phone?.playing;

  const doPlayPause = () => sendCommand(shownPlaying ? 'pause' : 'play');
  const doNext = () => sendCommand('next');
  const doPrev = () => sendCommand('prev');

  const renderRows = (list: Track[], ctx: string) =>
    list.map((t, i) => (
      <TrackRow
        key={t.id + i}
        t={t}
        isCur={current?.id === t.id}
        playing={playing}
        liked={!!isLiked(t.id)}
        onPlay={() => playFrom(list, i, ctx)}
      />
    ));

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo-row">
          <span className="bdot">
            <Icon icon={MusicNote01Icon} size={18} color="#1a1020" sw={2.4} />
          </span>
          <span className="logo-text">Musique</span>
        </div>
        <nav className="nav">
          <button className={'navitem' + (view === 'home' ? ' on' : '')} onClick={() => setView('home')}>
            <span className="ni-ic"><Icon icon={Home09Icon} size={20} /></span> Accueil
          </button>
          <button className={'navitem' + (view === 'all' ? ' on' : '')} onClick={() => setView('all')}>
            <span className="ni-ic"><Icon icon={LibraryIcon} size={20} /></span> Bibliothèque
          </button>
          <button className={'navitem' + (view === 'liked' ? ' on' : '')} onClick={() => setView('liked')}>
            <span className="ni-ic"><Icon icon={FavouriteIcon} size={20} /></span> Titres likés
          </button>
        </nav>
        <div className="side-sep" />
        <div className="side-label">Tes collections</div>
        <div className="side-list">
          {collections
            .filter(c => c.key !== 'all' && c.key !== 'liked')
            .map(c => {
              const cc = colCover(c);
              return (
                <button
                  key={c.key}
                  className={'side-pl' + (view === c.key ? ' on' : '')}
                  onClick={() => setView(c.key)}>
                  <div className="spl-cover" style={cc ? undefined : { background: grad(c.name) }}>
                    <Art src={cc} size={18} />
                  </div>
                  <div className="spl-meta">
                    <div className="spl-name">{c.name}</div>
                    <div className="spl-sub">{c.sub}</div>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="search-wrap">
            <span className="search-ic"><Icon icon={Search01Icon} size={18} color="#aaaaaa" /></span>
            <input
              className="search"
              placeholder="Rechercher un titre, un artiste…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="scroll">
          {q ? (
            <section className="block">
              <h2 className="bh">Résultats</h2>
              <div className="qgrid">
                {renderRows(searchResults, 'Résultats')}
                {searchResults.length === 0 && <div className="muted">Aucun résultat.</div>}
              </div>
            </section>
          ) : view === 'home' ? (
            <>
              <section className="block">
                <div className="shead">
                  <h2 className="bh">Écouter à nouveau</h2>
                </div>
                <div className="brow">
                  {collections.filter(c => c.tracks.length).map(c => (
                    <BigCard
                      key={c.key}
                      c={c}
                      onOpen={() => setView(c.key)}
                      onPlay={() => c.tracks.length && playFrom(c.tracks, 0, c.name)}
                    />
                  ))}
                </div>
              </section>

              <section className="block">
                <h2 className="bh">Sélection rapide</h2>
                <div className="qgrid">{renderRows(allTracks.slice(0, 24), 'Sélection rapide')}</div>
              </section>
            </>
          ) : (
            (() => {
              const c = colByKey(view) ?? collections[0];
              const hc = colCover(c);
              return (
                <>
                  <section className="hero">
                    <div className="hero-cover" style={hc ? undefined : { background: grad(c.name) }}>
                      <Art src={hc} size={56} />
                    </div>
                    <div className="hero-info">
                      <div className="hero-kind">{c.sub}</div>
                      <h2 className="hero-name">{c.name}</h2>
                      <div className="hero-meta">{c.tracks.length} titres</div>
                      <button
                        className="hero-play"
                        disabled={!c.tracks.length}
                        onClick={() => c.tracks.length && playFrom(c.tracks, 0, c.name)}>
                        <Icon icon={PlayIcon} size={18} color="#1a1020" sw={2.4} /> Lecture
                      </button>
                    </div>
                  </section>
                  <section className="block">
                    <div className="qgrid one">
                      {renderRows(c.tracks, c.name)}
                      {!c.tracks.length && <div className="muted">Collection vide.</div>}
                    </div>
                  </section>
                </>
              );
            })()
          )}
          <div style={{ height: 120 }} />
        </div>
      </div>

      {current && npOpen && (
        <div className="np">
          <div className="np-main">
            <div className="np-art" style={cover(current) ? undefined : { background: grad(current.title) }}>
              <Art src={cover(current)} size={96} />
            </div>
            <div className="np-meta">
              <h2>{current.title}</h2>
              <p>{current.artist}</p>
            </div>
          </div>

          <div className="np-side">
            <div className="np-tabs">
              <button className={npTab === 'next' ? 'on' : ''} onClick={() => setNpTab('next')}>
                À SUIVRE
              </button>
              <button className={npTab === 'lyrics' ? 'on' : ''} onClick={() => setNpTab('lyrics')}>
                PAROLES
              </button>
              <button className={npTab === 'related' ? 'on' : ''} onClick={() => setNpTab('related')}>
                SIMILAIRES
              </button>
            </div>

            {npTab === 'next' ? (
              <>
                <div className="np-from">
                  Lecture depuis
                  <b>{queueName}</b>
                </div>
                <div className="np-queue">
                  {queue.map((t, i) => {
                    const isCur = i === index;
                    return (
                      <div
                        key={t.id + '_' + i}
                        className={'nprow' + (isCur ? ' cur' : '')}
                        onClick={() => i !== index && goTo(i)}>
                        <div className="npq-thumb">
                          <Art src={cover(t)} size={18} />
                          {isCur && (
                            <div className="npq-ov">
                              {playing ? <Bars /> : <Icon icon={VolumeHighIcon} size={16} color="#fff" />}
                            </div>
                          )}
                        </div>
                        <div className="npq-meta">
                          <div className="npq-title">{t.title}</div>
                          <div className="npq-sub">{t.artist}</div>
                        </div>
                        <div className="npq-dur">{fmt(t.duration ?? 0)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="np-empty">Indisponible hors-ligne.</div>
            )}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={e => setPos((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={e => setDur((e.target as HTMLAudioElement).duration)}
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {shown && (
        <div className="player">
          <div
            className="seek"
            onClick={e => {
              if (!shownDur) return;
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const to = ((e.clientX - r.left) / r.width) * shownDur;
              sendCommand('seek', String(to));
            }}>
            <div
              className="seekfill"
              style={{ width: `${shownDur ? (shownPos / shownDur) * 100 : 0}%` }}>
              <span className="seekdot" />
            </div>
          </div>
          <div className="pbar">
            <div className="pleft">
              <div className="pthumb">
                <Art src={shown.artwork || cover(current)} size={20} />
              </div>
              <div className="pmeta">
                <div className="qtitle">{shown.title}</div>
                <div className="qsub">{shown.artist}</div>
              </div>
            </div>
            <div className="pcenter">
              <button
                className={'ctrl' + (shuffle ? ' act' : '')}
                onClick={() => setShuffle(s => !s)}
                aria-label="Lecture aléatoire">
                <Icon icon={ShuffleIcon} size={19} sw={2} />
              </button>
              <button onClick={doPrev} aria-label="Précédent">
                <Icon icon={PreviousIcon} size={22} sw={2} />
              </button>
              <button className="play" onClick={doPlayPause}>
                <Icon icon={shownPlaying ? PauseIcon : PlayIcon} size={18} color="#111" sw={2.4} />
              </button>
              <button onClick={doNext} aria-label="Suivant">
                <Icon icon={NextIcon} size={22} sw={2} />
              </button>
              <button
                className={'ctrl' + (repeat !== 'off' ? ' act' : '')}
                onClick={cycleRepeat}
                aria-label="Répéter">
                <Icon icon={repeat === 'one' ? RepeatOneIcon : RepeatIcon} size={19} sw={2} />
              </button>
            </div>
            <div className="pright">
              <span className="ptime">{fmt(shownPos)} / {fmt(shownDur)}</span>
              <button
                className={'ctrl' + (remote ? ' act' : '')}
                onClick={() => sendCommand('output', remote ? 'web' : 'phone')}
                aria-label="Appareil de lecture"
                title={remote ? 'Le son sort du téléphone' : 'Le son sort de ce navigateur'}>
                <Icon icon={remote ? SmartPhone01Icon : ComputerIcon} size={20} sw={2} />
              </button>
              <button
                className="np-toggle"
                aria-label="Lecture en cours"
                onClick={() => setNpOpen(o => !o)}>
                <Icon icon={npOpen ? ArrowDown01Icon : ArrowUp01Icon} size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pairing({ onPair }: { onPair: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await onPair(pin.trim());
    } catch (e: any) {
      setErr(e?.message ?? 'Échec');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <form className="pair" onSubmit={submit}>
        <div className="logo">♪</div>
        <h2>Connexion à ton téléphone</h2>
        <p className="muted">Saisis le code PIN affiché dans Réglages → Accès web.</p>
        <input
          className="pin"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
        {err && <div className="err">{err}</div>}
        <button className="connect" disabled={busy || pin.length < 4}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}

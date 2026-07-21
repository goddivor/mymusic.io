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
  Search01Icon,
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

const trackUrl = (id: string, token: string) =>
  `${API}/track/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;

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

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [lib, setLib] = useState<Lib | null>(null);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [view, setView] = useState<string>('home');
  const [search, setSearch] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueName, setQueueName] = useState('File d\'attente');
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
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
      setLib(data);
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
    setQueue(list);
    setQueueName(ctx);
    setIndex(i);
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current || !token) return;
    a.src = trackUrl(current.id, token);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        artwork: cover(current) ? [{ src: cover(current), sizes: '512x512' }] : [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id, token]);

  const next = () => index < queue.length - 1 && setIndex(index + 1);
  const prev = () => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) return void (a.currentTime = 0);
    if (index > 0) setIndex(index - 1);
  };
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
  };
  const isLiked = (id: string) => lib?.likedIds.includes(id);

  if (authNeeded) return <Pairing onPair={pair} />;
  if (!lib) return <div className="center muted">Chargement…</div>;

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? allTracks.filter(
        t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
      )
    : [];

  const TrackRow = ({ list, i, ctx }: { list: Track[]; i: number; ctx?: string }) => {
    const t = list[i];
    const isCur = current?.id === t.id;
    return (
      <div className={'qrow' + (isCur ? ' cur' : '')} onClick={() => playFrom(list, i, ctx)}>
        <div className="qthumb">
          {cover(t) ? <img src={cover(t)} alt="" /> : <Icon icon={MusicNote01Icon} size={20} color="#717171" />}
          <div className="qov">
            <Icon icon={isCur && playing ? PauseIcon : PlayIcon} size={16} color="#fff" sw={2} />
          </div>
        </div>
        <div className="qmeta">
          <div className="qtitle">
            {t.title}{' '}
            {isLiked(t.id) && (
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
  };

  const BigCard = ({ c }: { c: Collection }) => {
    const cc = colCover(c);
    return (
      <div className="bcard" onClick={() => setView(c.key)}>
        <div className="bcover" style={cc ? undefined : { background: grad(c.name) }}>
          {cc ? <img src={cc} alt="" /> : <span>{c.name[0]}</span>}
          <button
            className="bplay"
            onClick={e => {
              e.stopPropagation();
              if (c.tracks.length) playFrom(c.tracks, 0, c.name);
            }}>
            <Icon icon={PlayIcon} size={16} color="#fff" sw={2.2} />
          </button>
        </div>
        <div className="bname">{c.name}</div>
        <div className="bsub">{c.sub} · {c.tracks.length} titres</div>
      </div>
    );
  };

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
                    {cc ? <img src={cc} alt="" /> : <span>{c.name[0]}</span>}
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
                {searchResults.map((t, i) => (
                  <TrackRow key={t.id + i} list={searchResults} i={i} ctx="Résultats" />
                ))}
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
                    <BigCard key={c.key} c={c} />
                  ))}
                </div>
              </section>

              <section className="block">
                <h2 className="bh">Sélection rapide</h2>
                <div className="qgrid">
                  {allTracks.slice(0, 24).map((t, i) => (
                    <TrackRow key={t.id + i} list={allTracks} i={i} ctx="Sélection rapide" />
                  ))}
                </div>
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
                      {hc ? <img src={hc} alt="" /> : <Icon icon={MusicNote01Icon} size={56} color="#fff" />}
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
                      {c.tracks.map((t, i) => (
                        <TrackRow key={t.id + i} list={c.tracks} i={i} ctx={c.name} />
                      ))}
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
              {cover(current) ? (
                <img src={cover(current)} alt="" />
              ) : (
                <Icon icon={MusicNote01Icon} size={96} color="#fff" />
              )}
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
                        onClick={() => setIndex(i)}>
                        <div className="npq-thumb">
                          {cover(t) ? (
                            <img src={cover(t)} alt="" />
                          ) : (
                            <Icon icon={MusicNote01Icon} size={18} color="#717171" />
                          )}
                          {isCur && (
                            <div className="npq-ov">
                              <Icon icon={VolumeHighIcon} size={16} color="#fff" />
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
        onEnded={next}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {current && (
        <div className="player">
          <div
            className="seek"
            onClick={e => {
              const a = audioRef.current;
              if (!a || !dur) return;
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              a.currentTime = ((e.clientX - r.left) / r.width) * dur;
            }}>
            <div className="seekfill" style={{ width: `${dur ? (pos / dur) * 100 : 0}%` }}>
              <span className="seekdot" />
            </div>
          </div>
          <div className="pbar">
            <div className="pleft">
              <div className="pthumb">
                {cover(current) ? <img src={cover(current)} alt="" /> : <Icon icon={MusicNote01Icon} size={20} color="#717171" />}
              </div>
              <div className="pmeta">
                <div className="qtitle">{current.title}</div>
                <div className="qsub">{current.artist}</div>
              </div>
            </div>
            <div className="pcenter">
              <button onClick={prev} aria-label="Précédent">
                <Icon icon={PreviousIcon} size={22} sw={2} />
              </button>
              <button className="play" onClick={togglePlay}>
                <Icon icon={playing ? PauseIcon : PlayIcon} size={18} color="#111" sw={2.4} />
              </button>
              <button onClick={next} aria-label="Suivant">
                <Icon icon={NextIcon} size={22} sw={2} />
              </button>
            </div>
            <div className="pright">
              <span className="ptime">{fmt(pos)} / {fmt(dur)}</span>
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

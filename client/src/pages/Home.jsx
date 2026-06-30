import { useState, useEffect } from 'react'
import { Play, Pause, Music, Sparkles, RefreshCw, Share2, Heart } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import { searchSongs, getNewReleases, isSongLiked, likeSong, unlikeSong } from '../api/songs'
import { usePlayer } from '../context/PlayerContext'
import { suggestForMe } from '../phase7/api/ai'
import { getTaste } from '../api/taste'
import SharePanel from '../phase5/components/SharePanel'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function AlbumArt({ song, size = 'full', className = '' }) {
  return (
    <div className={`${size === 'full' ? 'w-full aspect-square' : ''} ${className} rounded-md overflow-hidden bg-[#282828] flex items-center justify-center`}>
      {song?.albumArtUrl
        ? <img src={song.albumArtUrl} alt={song.album ?? song.title} className="w-full h-full object-cover" />
        : <Music size={28} className="text-white/30" />
      }
    </div>
  )
}

function QuickPickCard({ song }) {
  const player = usePlayer()
  const active  = player.isActive(song)
  const playing = active && player.playing

  return (
    <button
      className="flex items-center gap-3 bg-[#ffffff12] hover:bg-[#ffffff1f] rounded-md overflow-hidden transition-colors group/pick text-left w-full"
      onClick={() => player.toggle(song)}
    >
      <div className="w-16 h-16 flex-shrink-0 rounded-none overflow-hidden bg-[#282828]">
        {song.albumArtUrl
          ? <img src={song.albumArtUrl} alt={song.album ?? song.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-white/40" /></div>
        }
      </div>
      <span className={`flex-1 font-semibold text-sm pr-2 leading-tight truncate ${active ? 'text-[#1DB954]' : 'text-white'}`}>
        {song.title}
      </span>
      <div className={`mr-4 w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg flex-shrink-0 transition-all duration-150 ${playing ? 'opacity-100' : 'opacity-0 translate-y-1 group-hover/pick:opacity-100 group-hover/pick:translate-y-0'}`}>
        {playing
          ? <Pause size={14} className="fill-black text-black" />
          : <Play  size={14} className="fill-black text-black" />
        }
      </div>
    </button>
  )
}

function SongCard({ song }) {
  const player  = usePlayer()
  const active  = player.isActive(song)
  const playing = active && player.playing

  return (
    <div className="group cursor-pointer" onClick={() => player.toggle(song)}>
      <div className="bg-[#181818] hover:bg-[#282828] rounded-lg p-4 transition-colors relative">
        <div className="w-full aspect-square rounded-md overflow-hidden bg-[#282828] relative mb-3">
          {song.albumArtUrl
            ? <img src={song.albumArtUrl} alt={song.album ?? song.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Music size={32} className="text-white/20" /></div>
          }
          <div className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-xl transition-all duration-200 ${playing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
            {playing
              ? <Pause size={16} className="fill-black text-black" />
              : <Play  size={16} className="fill-black text-black" />
            }
          </div>
        </div>
        <p className={`font-semibold text-sm truncate ${active ? 'text-[#1DB954]' : 'text-white'}`}>{song.title}</p>
        <p className="text-[#B3B3B3] text-xs mt-1 truncate leading-relaxed">{song.artist}</p>
      </div>
    </div>
  )
}

function SongRow({ title, songs, offset = 0, count = 5 }) {
  const [expanded, setExpanded] = useState(false)
  const available = songs.slice(offset)
  const slice     = expanded ? available : available.slice(0, count)
  if (!slice.length) return null
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-xl">{title}</h2>
        {available.length > count && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[#B3B3B3] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {expanded ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-x-visible md:pb-0 scrollbar-hide">
        {slice.map(song => (
          <div key={song.spotifyId} className="min-w-[140px] w-[140px] md:min-w-0 md:w-auto flex-shrink-0 md:flex-shrink">
            <SongCard song={song} />
          </div>
        ))}
      </div>
    </section>
  )
}

function ForYouCard({ song, onShare }) {
  const player  = usePlayer()
  const active  = player.isActive(song)
  const playing = active && player.playing
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    isSongLiked(song.spotifyId).then(r => setLiked(r.data.liked)).catch(() => {})
  }, [song.spotifyId])

  async function handleLike(e) {
    e.stopPropagation()
    try {
      if (liked) { await unlikeSong(song.spotifyId); setLiked(false) }
      else        { await likeSong(song.spotifyId);   setLiked(true)  }
    } catch {}
  }

  return (
    <div className="group">
      <div
        className="bg-[#181818] hover:bg-[#282828] rounded-lg p-4 transition-colors relative cursor-pointer"
        onClick={() => player.toggle(song)}
      >
        <div className="w-full aspect-square rounded-md overflow-hidden bg-[#282828] relative mb-3">
          {song.albumArtUrl
            ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Music size={32} className="text-white/20" /></div>
          }
          <div className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-xl transition-all duration-200 ${playing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
            {playing ? <Pause size={16} className="fill-black text-black" /> : <Play size={16} className="fill-black text-black" />}
          </div>
        </div>
        <p className={`font-semibold text-sm truncate ${active ? 'text-[#1DB954]' : 'text-white'}`}>{song.title}</p>
        <p className="text-[#B3B3B3] text-xs mt-1 truncate">{song.artist}</p>
      </div>
      <div className="flex items-center gap-3 mt-2 px-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-[10px] font-semibold transition-colors ${liked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'}`}
        >
          <Heart size={10} className={liked ? 'fill-[#1DB954]' : ''} />
          {liked ? 'Liked' : 'Like'}
        </button>
        <button
          onClick={() => onShare(song)}
          className="flex items-center gap-1 text-[10px] text-[#B3B3B3] hover:text-white font-semibold transition-colors"
        >
          <Share2 size={10} /> Share
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const user  = JSON.parse(localStorage.getItem('user') || '{}')
  const CACHE_KEY = `forYou_${user.id || 'anon'}`

  const [songs, setSongs]       = useState([])
  const [loading, setLoading]   = useState(true)

  // "Picked For You" state
  const [forYou, setForYou]           = useState([])
  const [forYouLoading, setForYouLoading] = useState(false)
  const [forYouError, setForYouError]     = useState('')
  const [hasTaste, setHasTaste]           = useState(null) // null = unknown
  const [shareSong, setShareSong]         = useState(null)

  // On mount: check taste profile; use cache if taste hasn't changed since last generation
  useEffect(() => {
    getTaste()
      .then(({ data }) => {
        const has = !!(data.genres?.length || data.artists?.length || data.moods?.length)
        setHasTaste(has)
        if (!has) return

        const tasteVersion = data.updatedAt ? new Date(data.updatedAt).toISOString() : null

        if (tasteVersion) {
          try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
            if (cached?.version === tasteVersion && cached?.songs?.length > 0) {
              setForYou(cached.songs)
              return // cache hit — no AI call needed
            }
          } catch {}
        }

        // Cache miss or taste has changed since last generation
        fetchAndCacheForYou(tasteVersion)
      })
      .catch(() => setHasTaste(false))
  }, [])

  async function fetchAndCacheForYou(tasteVersion) {
    setForYouLoading(true)
    setForYouError('')
    try {
      const { data } = await suggestForMe()
      const songs = data.songs || []
      setForYou(songs)
      if (tasteVersion && songs.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ songs, version: tasteVersion }))
        } catch {}
      }
    } catch (e) {
      setForYouError(e.response?.data?.error || 'Could not load suggestions.')
    } finally {
      setForYouLoading(false)
    }
  }

  // Refresh button: always fetch fresh suggestions and update the cache
  async function handleRefresh() {
    setForYouLoading(true)
    setForYouError('')
    try {
      const [{ data: aiData }, { data: tasteData }] = await Promise.all([
        suggestForMe(),
        getTaste(),
      ])
      const songs = aiData.songs || []
      setForYou(songs)
      const tasteVersion = tasteData.updatedAt ? new Date(tasteData.updatedAt).toISOString() : null
      if (songs.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ songs, version: tasteVersion }))
        } catch {}
      }
    } catch (e) {
      setForYouError(e.response?.data?.error || 'Could not load suggestions.')
    } finally {
      setForYouLoading(false)
    }
  }

  useEffect(() => {
    getNewReleases()
      .then(({ data }) => {
        const releases = data.releases || []
        // Supplement with a popular search if chart returns fewer than 15 songs
        if (releases.length >= 15) {
          setSongs(releases)
          setLoading(false)
        } else {
          searchSongs('popular songs')
            .then(r => {
              const extra = (r.data.tracks || []).filter(
                t => !releases.find(s => s.spotifyId === t.spotifyId)
              )
              setSongs([...releases, ...extra])
            })
            .catch(() => setSongs(releases))
            .finally(() => setLoading(false))
        }
      })
      .catch(() => {
        // Fallback to search if new releases endpoint fails
        searchSongs('popular songs')
          .then(r => setSongs(r.data.tracks || []))
          .catch(() => {})
          .finally(() => setLoading(false))
      })
  }, [])

  const quickPicks = songs.slice(0, 6)
  const row1       = songs.slice(6, 11)
  const row2       = songs.slice(11, 16)
  const row3       = songs.length > 16 ? songs.slice(16, 21) : songs.slice(1, 6)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Gradient header */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/80 via-[#121212]/60 to-transparent pointer-events-none" />
        <TopBar transparent />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <h1 className="text-white font-bold text-3xl mt-4 mb-6">
          {greeting()}{user.displayName ? `, ${user.displayName}` : ''}
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : songs.length === 0 ? (
          <p className="text-[#B3B3B3] text-sm py-8">Could not load songs. Check your connection.</p>
        ) : (
          <div className="space-y-8">
            {/* Quick picks — 1 column on mobile (3 items), 3 columns on desktop (6 items) */}
            {quickPicks.length > 0 && (
              <div className="grid grid-cols-1 gap-2 mb-8 md:grid-cols-3">
                {quickPicks.map((song, i) => (
                  <div key={song.spotifyId} className={i >= 3 ? 'hidden md:block' : ''}>
                    <QuickPickCard song={song} />
                  </div>
                ))}
              </div>
            )}

            {/* Picked For You */}
            {hasTaste && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-xl flex items-center gap-2">
                    <Sparkles size={18} className="text-[#1DB954]" />
                    Picked For You
                  </h2>
                  <button
                    onClick={handleRefresh}
                    disabled={forYouLoading}
                    className="flex items-center gap-1.5 text-[#B3B3B3] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={11} className={forYouLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {forYouLoading && (
                  <div className="flex items-center gap-3 text-[#B3B3B3] text-sm py-4">
                    <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                    Finding songs you'll love…
                  </div>
                )}

                {forYouError && !forYouLoading && (
                  <p className="text-[#B3B3B3] text-sm py-2">{forYouError}</p>
                )}

                {!forYouLoading && forYou.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0 scrollbar-hide">
                    {forYou.map(song => (
                      <div key={song.spotifyId} className="min-w-[150px] w-[150px] md:min-w-0 md:w-auto flex-shrink-0 md:flex-shrink">
                        <ForYouCard song={song} onShare={setShareSong} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {row1.length > 0 && <SongRow title="Top Charts"      songs={songs} offset={6}  count={5} />}
            {row2.length > 0 && <SongRow title="Trending Now"    songs={songs} offset={11} count={5} />}
            {row3.length > 0 && <SongRow title="Popular Picks"   songs={songs} offset={16} count={5} />}
          </div>
        )}
      </div>

      {shareSong && (
        <SharePanel song={shareSong} onClose={() => setShareSong(null)} />
      )}
    </div>
  )
}

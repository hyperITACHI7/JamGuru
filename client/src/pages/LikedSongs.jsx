import { useState, useEffect } from 'react'
import { Heart, Play, Pause, Music, Clock, RefreshCw } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import { getLikedSongs } from '../api/songs'
import { syncSpotifyLikes } from '../api/auth'
import { unlikeSong } from '../phase4/api/likes'
import { usePlayer } from '../context/PlayerContext'

function SongRow({ song, index, onUnlike }) {
  const player  = usePlayer()
  const active  = player.isActive(song)
  const playing = active && player.playing

  return (
    <div
      className="grid items-center gap-4 px-4 py-2 rounded-md hover:bg-[#ffffff0d] group cursor-pointer transition-colors"
      style={{ gridTemplateColumns: '16px 4fr 3fr 60px' }}
      onClick={() => player.toggle(song)}
    >
      {/* Index / play icon */}
      <div className="flex items-center justify-center text-[#B3B3B3] text-sm tabular-nums w-4">
        {active
          ? (
            <button className="text-[#1DB954]">
              {playing ? <Pause size={14} className="fill-[#1DB954]" /> : <Play size={14} className="fill-[#1DB954]" />}
            </button>
          )
          : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Play size={14} className="hidden group-hover:block fill-white text-white" />
            </>
          )
        }
      </div>

      {/* Title + art */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 bg-[#282828]">
          {song.albumArtUrl
            ? <img src={song.albumArtUrl} alt={song.album ?? song.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-white/30" /></div>
          }
        </div>
        <div className="overflow-hidden">
          <p className={`text-sm font-medium truncate ${active ? 'text-[#1DB954]' : 'text-white'}`}>{song.title}</p>
          <p className="text-[#B3B3B3] text-xs truncate mt-0.5">{song.artist}</p>
        </div>
      </div>

      {/* Album */}
      <p className="text-[#B3B3B3] text-sm truncate">{song.album}</p>

      {/* Unlike / Reconsider */}
      <div className="flex items-center justify-end pr-2">
        <button
          onClick={e => { e.stopPropagation(); onUnlike(song.spotifyId) }}
          title="Remove from liked songs"
          className="group/heart text-[#1DB954] hover:text-red-400 transition-colors"
        >
          <Heart size={16} className="fill-current group-hover/heart:fill-red-400 transition-colors" />
        </button>
      </div>
    </div>
  )
}

export default function LikedSongs() {
  const [songs, setSongs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const player = usePlayer()

  function fetchSongs() {
    setLoading(true)
    getLikedSongs()
      .then(({ data }) => setSongs(data.songs || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSongs() }, [])

  async function handleUnlike(spotifyId) {
    try {
      await unlikeSong(spotifyId)
      setSongs(prev => prev.filter(s => s.spotifyId !== spotifyId))
    } catch (_) {}
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const { data } = await syncSpotifyLikes()
      setSyncMsg(`Synced ${data.synced} songs (${data.added} new)`)
      fetchSongs()
    } catch {
      setSyncMsg('Sync failed — make sure your Spotify account is connected.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative flex-shrink-0">
        <div className="absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-indigo-900/80 via-[#121212]/60 to-transparent pointer-events-none" />
        <TopBar transparent />
      </div>

      <div className="flex-1 overflow-y-auto relative z-10">
        {/* Hero — sits on top of the header's gradient (extended down via the div above), so
            the color fade reads as one continuous wash instead of restarting a second time. */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-6 pt-2 pb-4">
            <div className="w-48 h-48 flex-shrink-0 rounded-md bg-gradient-to-br from-indigo-500 to-violet-800 flex items-center justify-center shadow-2xl">
              <Heart size={64} className="fill-white text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-2">Playlist</p>
              <h1 className="text-white font-black text-5xl mb-3 leading-none">Liked Songs</h1>
              <p className="text-[#B3B3B3] text-sm">
                {loading ? '…' : `${songs.length} song${songs.length !== 1 ? 's' : ''}`}
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-3 flex items-center gap-2 text-xs text-[#1DB954] hover:text-white border border-[#1DB954] hover:border-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync from Spotify'}
              </button>
              {syncMsg && <p className="text-xs text-[#B3B3B3] mt-2">{syncMsg}</p>}
            </div>
          </div>

          {/* Play button */}
          {!loading && songs.length > 0 && (
            <button
              onClick={() => player.play(songs[0])}
              className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              <Play size={24} className="fill-black text-black ml-1" />
            </button>
          )}
        </div>

        {/* Track list */}
        <div className="px-6 pb-8">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && songs.length === 0 && (
            <div className="text-center py-16">
              <Heart size={48} className="text-[#B3B3B3] mx-auto mb-4" />
              <h2 className="text-white font-bold text-xl mb-2">Songs you like will appear here</h2>
              <p className="text-[#B3B3B3] text-sm max-w-sm mx-auto">
                Like recommendations in your Discovery Inbox to save them here.
              </p>
            </div>
          )}

          {!loading && songs.length > 0 && (
            <>
              {/* Header row */}
              <div
                className="grid items-center gap-4 px-4 pb-2 mb-2 border-b border-white/10 text-[#B3B3B3] text-xs font-bold uppercase tracking-widest"
                style={{ gridTemplateColumns: '16px 4fr 3fr 60px' }}
              >
                <span className="text-center">#</span>
                <span>Title</span>
                <span>Album</span>
                <Clock size={14} className="ml-auto mr-2" />
              </div>

              {songs.map((song, i) => (
                <SongRow key={song.spotifyId} song={song} index={i} onUnlike={handleUnlike} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

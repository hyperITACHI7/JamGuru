import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Music, Play, Pause, Clock } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import { getPlaylist } from '../api/auth'
import { usePlayer } from '../context/PlayerContext'

function SongRow({ song, index }) {
  const player  = usePlayer()
  const active  = player.isActive(song)
  const playing = active && player.playing

  return (
    <div
      className="grid items-center gap-4 px-4 py-2 rounded-md hover:bg-[#ffffff0d] group cursor-pointer transition-colors"
      style={{ gridTemplateColumns: '16px 4fr 3fr 60px' }}
      onClick={() => player.toggle(song)}
    >
      <div className="flex items-center justify-center text-[#B3B3B3] text-sm tabular-nums w-4">
        {active ? (
          <button className="text-[#1DB954]">
            {playing
              ? <Pause size={14} className="fill-[#1DB954]" />
              : <Play size={14} className="fill-[#1DB954]" />}
          </button>
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <Play size={14} className="hidden group-hover:block fill-white text-white" />
          </>
        )}
      </div>

      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 bg-[#282828]">
          {song.albumArtUrl
            ? <img src={song.albumArtUrl} alt={song.album} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-white/30" /></div>}
        </div>
        <div className="overflow-hidden">
          <p className={`text-sm font-medium truncate ${active ? 'text-[#1DB954]' : 'text-white'}`}>{song.title}</p>
          <p className="text-[#B3B3B3] text-xs truncate mt-0.5">{song.artist}</p>
        </div>
      </div>

      <p className="text-[#B3B3B3] text-sm truncate">{song.album}</p>

      <div className="flex items-center justify-end pr-2">
        <Music size={14} className="text-[#1DB954]" />
      </div>
    </div>
  )
}

export default function PlaylistDetail() {
  const { id } = useParams()
  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading]   = useState(true)
  const player = usePlayer()

  useEffect(() => {
    getPlaylist(id)
      .then(({ data }) => setPlaylist(data.playlist))
      .finally(() => setLoading(false))
  }, [id])

  const songs = playlist?.songs?.map(ps => ps.song) ?? []

  const accentColor = '#1DB954'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/70 via-[#121212]/60 to-transparent pointer-events-none" />
        <TopBar transparent />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-6 pb-6 bg-gradient-to-b from-emerald-900/50 to-transparent">
          <div className="flex items-end gap-6 pt-2 pb-4">
            <div className="w-48 h-48 flex-shrink-0 rounded-md shadow-2xl overflow-hidden bg-[#282828]">
              {playlist?.coverUrl
                ? <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Music size={64} className="text-[#B3B3B3]" />
                  </div>}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-2">Playlist</p>
              <h1 className="text-white font-black text-4xl md:text-5xl mb-3 leading-none truncate max-w-lg">
                {loading ? '…' : playlist?.name}
              </h1>
              {playlist?.description && (
                <p className="text-[#B3B3B3] text-sm mb-2 max-w-md line-clamp-2">{playlist.description}</p>
              )}
              <p className="text-[#B3B3B3] text-sm">
                {loading ? '…' : `${songs.length} song${songs.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {!loading && songs.length > 0 && (
            <button
              onClick={() => player.play(songs[0])}
              className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              style={{ background: accentColor }}
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
              <Music size={48} className="text-[#B3B3B3] mx-auto mb-4" />
              <p className="text-white font-bold text-xl mb-2">No songs in this playlist</p>
            </div>
          )}

          {!loading && songs.length > 0 && (
            <>
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
                <SongRow key={song.spotifyId} song={song} index={i} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

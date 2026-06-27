import { useState, useEffect } from 'react'
import {
  Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat,
  Mic2, ListMusic, Monitor, Volume2, Maximize2, Music, Share2
} from 'lucide-react'
import { usePlayer } from '../../context/PlayerContext'
import { isSongLiked, likeSong, unlikeSong } from '../../api/songs'
import SharePanel from '../../phase5/components/SharePanel'

function fmtTime(sec) {
  const s = Math.floor(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function NowPlayingBar() {
  const player = usePlayer()
  const [liked,   setLiked]   = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat,  setRepeat]  = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const { track, playing, progress, duration, volume, toggle, seek, changeVolume } = player
  const pct    = duration > 0 ? (progress / duration) * 100 : 0
  const volPct = Math.round(volume * 100)

  useEffect(() => {
    if (!track?.spotifyId) { setLiked(false); return }
    isSongLiked(track.spotifyId)
      .then(({ data }) => setLiked(data.liked))
      .catch(() => setLiked(false))
  }, [track?.spotifyId])

  async function toggleLike() {
    if (!track) return
    try {
      if (liked) { await unlikeSong(track.spotifyId); setLiked(false) }
      else        { await likeSong(track.spotifyId);   setLiked(true)  }
    } catch (_) {}
  }

  return (
    <>
      {/* ── Mobile player ── compact strip */}
      <footer className="md:hidden flex-shrink-0 bg-[#181818] border-t border-white/5">
        {/* Progress bar flush at top */}
        <div
          className="h-0.5 bg-[#535353] cursor-pointer relative"
          onClick={e => {
            if (!track) return
            const rect = e.currentTarget.getBoundingClientRect()
            seek(((e.clientX - rect.left) / rect.width) * duration)
          }}
        >
          <div className="absolute top-0 left-0 h-full bg-[#1DB954]" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center gap-3 px-4 h-16">
          {/* Album art */}
          <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#282828] shadow">
            {track?.albumArtUrl
              ? <img src={track.albumArtUrl} alt={track.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-white/40" /></div>
            }
          </div>

          {/* Title + artist */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate leading-tight">
              {track?.title ?? 'Nothing playing'}
            </p>
            {track?.artist && (
              <p className="text-[#B3B3B3] text-xs truncate mt-0.5">{track.artist}</p>
            )}
          </div>

          {/* Heart */}
          <button
            onClick={toggleLike}
            disabled={!track}
            className={`flex-shrink-0 p-1 transition-colors disabled:opacity-30 ${liked ? 'text-[#1DB954]' : 'text-[#B3B3B3]'}`}
          >
            <Heart size={20} className={liked ? 'fill-[#1DB954]' : ''} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => track && toggle(track)}
            disabled={!track}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center disabled:opacity-30"
          >
            {playing
              ? <Pause size={16} className="fill-black text-black" />
              : <Play  size={16} className="fill-black text-black" />
            }
          </button>
        </div>
      </footer>

      {/* ── Desktop player ── full controls */}
      <footer className="hidden md:flex h-[90px] bg-[#181818] border-t border-white/5 items-center px-4 gap-4 flex-shrink-0">

        {/* Left — track info */}
        <div className="w-[280px] flex items-center gap-3 flex-shrink-0">
          {track ? (
            <>
              <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 shadow-md bg-[#282828]">
                {track.albumArtUrl
                  ? <img src={track.albumArtUrl} alt={track.album ?? track.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-white/40" /></div>
                }
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-medium truncate hover:underline cursor-pointer leading-snug">{track.title}</p>
                <p className="text-[#B3B3B3] text-xs truncate hover:text-white hover:underline cursor-pointer mt-0.5">{track.artist}</p>
              </div>
              <button
                onClick={toggleLike}
                title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                className={`ml-2 transition-colors flex-shrink-0 ${liked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'}`}
              >
                <Heart size={16} className={liked ? 'fill-[#1DB954]' : ''} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 opacity-40 select-none">
              <div className="w-14 h-14 rounded-md bg-[#282828] flex items-center justify-center flex-shrink-0">
                <Music size={18} className="text-white/40" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Nothing playing</p>
                <p className="text-[#B3B3B3] text-xs">Play a song to start</p>
              </div>
            </div>
          )}
        </div>

        {/* Center — controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-5">
            <button onClick={() => setShuffle(v => !v)} className={`transition-colors ${shuffle ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'}`}>
              <Shuffle size={16} />
            </button>
            <button onClick={() => seek(0)} className="text-[#B3B3B3] hover:text-white transition-colors">
              <SkipBack size={18} />
            </button>
            <button
              onClick={() => track && toggle(track)}
              disabled={!track}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {playing ? <Pause size={16} className="fill-black text-black" /> : <Play size={16} className="fill-black text-black" />}
            </button>
            <button className="text-[#B3B3B3] hover:text-white transition-colors"><SkipForward size={18} /></button>
            <button onClick={() => setRepeat(v => !v)} className={`transition-colors ${repeat ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'}`}>
              <Repeat size={16} />
            </button>
          </div>

          <div className="w-full max-w-[500px] flex items-center gap-2">
            <span className="text-[#B3B3B3] text-[10px] w-8 text-right tabular-nums">{fmtTime(progress)}</span>
            <div
              className="relative flex-1 h-1 group cursor-pointer"
              onClick={e => {
                if (!track) return
                const rect = e.currentTarget.getBoundingClientRect()
                seek(((e.clientX - rect.left) / rect.width) * duration)
              }}
            >
              <div className="absolute inset-0 bg-[#535353] rounded-full" />
              <div className="absolute top-0 left-0 h-full bg-white group-hover:bg-[#1DB954] rounded-full transition-colors" style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${pct}% - 6px)` }} />
            </div>
            <span className="text-[#B3B3B3] text-[10px] w-8 tabular-nums">{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Right — extra controls */}
        <div className="w-[280px] flex items-center justify-end gap-3 flex-shrink-0">
          <button className="text-[#B3B3B3] hover:text-white transition-colors"><Mic2 size={16} /></button>
          <button className="text-[#B3B3B3] hover:text-white transition-colors"><ListMusic size={16} /></button>
          <button className="text-[#B3B3B3] hover:text-white transition-colors"><Monitor size={16} /></button>
          <button
            onClick={() => track && setShareOpen(true)}
            disabled={!track}
            title="Share this song"
            className={`transition-colors ${track ? 'text-[#B3B3B3] hover:text-white' : 'text-[#535353] cursor-not-allowed'}`}
          >
            <Share2 size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            <Volume2 size={16} className="text-[#B3B3B3]" />
            <div
              className="relative w-24 h-1 group cursor-pointer"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                changeVolume((e.clientX - rect.left) / rect.width)
              }}
            >
              <div className="absolute inset-0 bg-[#535353] rounded-full" />
              <div className="absolute top-0 left-0 h-full bg-white group-hover:bg-[#1DB954] rounded-full transition-colors" style={{ width: `${volPct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${volPct}% - 6px)` }} />
            </div>
          </div>
          <button className="text-[#B3B3B3] hover:text-white transition-colors"><Maximize2 size={14} /></button>
        </div>
      </footer>

      {shareOpen && track && (
        <SharePanel song={track} onClose={() => setShareOpen(false)} />
      )}
    </>
  )
}

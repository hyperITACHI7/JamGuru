import { useState } from 'react'
import { Heart, Music, Play, Pause } from 'lucide-react'
import { likeGroupRec, unlikeGroupRec } from '../api/groups'
import { usePlayer } from '../../context/PlayerContext'

function Avatar({ name, size = 8 }) {
  return (
    <div
      className="rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: size * 1.6 + 'px' }}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function GroupFeedCard({ rec, groupId, onLikeChange }) {
  const [liked, setLiked]     = useState(rec.liked)
  const [likeCount, setCount] = useState(rec.likeCount)
  const [busy, setBusy]       = useState(false)
  const player   = usePlayer()
  const isActive = player.isActive(rec.song)
  const playing  = isActive && player.playing

  async function toggleLike() {
    if (busy) return
    setBusy(true)
    try {
      if (liked) {
        await unlikeGroupRec(groupId, rec.id)
        setLiked(false)
        setCount(c => c - 1)
      } else {
        await likeGroupRec(groupId, rec.id)
        setLiked(true)
        setCount(c => c + 1)
      }
      onLikeChange?.()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  function togglePlay() {
    player.toggle(rec.song)
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 flex gap-4 group hover:bg-[#222] transition-colors">
      {/* Album art */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#333] flex-shrink-0 relative">
        {rec.song.albumArtUrl
          ? <img src={rec.song.albumArtUrl} alt={rec.song.album} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Music size={20} className="text-[#B3B3B3]" /></div>
        }
        {rec.song.previewUrl && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {playing
              ? <Pause size={20} className="text-white fill-white" />
              : <Play  size={20} className="text-white fill-white" />
            }
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{rec.song.title}</p>
        <p className="text-[#B3B3B3] text-xs truncate mb-1">{rec.song.artist}</p>

        {/* Sender */}
        <div className="flex items-center gap-1.5 mb-1">
          <Avatar name={rec.sender.displayName} size={5} />
          <span className="text-[#B3B3B3] text-xs">{rec.sender.displayName}</span>
        </div>

        {rec.context && (
          <p className="text-[#B3B3B3] text-xs italic leading-snug line-clamp-2">"{rec.context}"</p>
        )}
      </div>

      {/* Like */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <button
          onClick={toggleLike}
          disabled={busy}
          className={`p-1.5 rounded-full transition-all ${liked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'} disabled:opacity-50`}
        >
          <Heart size={18} className={liked ? 'fill-current' : ''} />
        </button>
        <span className="text-[#B3B3B3] text-[10px]">{likeCount}</span>
      </div>
    </div>
  )
}

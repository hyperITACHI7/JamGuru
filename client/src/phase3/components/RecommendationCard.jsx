import { useState } from 'react'
import { Play, Pause, Heart, Music, ThumbsDown } from 'lucide-react'
import FeedbackTags from '../../phase4/components/FeedbackTags'
import {
  likeRecommendation, unlikeRecommendation,
  dismissRecommendation, undismissRecommendation,
  dislikeRecommendation, undislikeRecommendation,
} from '../../phase4/api/likes'
import { usePlayer } from '../../context/PlayerContext'

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function RecommendationCard({ rec: initialRec }) {
  const [rec, setRec]           = useState(initialRec)
  const [liking, setLiking]     = useState(false)
  const [reaction, setReaction] = useState(null) // null | 'dismiss' | 'dislike'
  const [showTags, setShowTags] = useState(false)
  const player   = usePlayer()
  const isActive = player.isActive(rec.song)
  const playing  = isActive && player.playing

  // locked while tag picker is open or a reaction is active
  const tagPickerOpen  = showTags && !!rec.likeId
  const dismissActive  = reaction === 'dismiss'
  const dislikeActive  = reaction === 'dislike'
  const anyReaction    = dismissActive || dislikeActive

  async function handleDismiss() {
    try {
      if (dismissActive) {
        await undismissRecommendation(rec.id)
        setReaction(null)
      } else {
        await dismissRecommendation(rec.id)
        setReaction('dismiss')
      }
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (_) {}
  }

  async function handleDislike() {
    try {
      if (dislikeActive) {
        await undislikeRecommendation(rec.id)
        setReaction(null)
      } else {
        await dislikeRecommendation(rec.id)
        setReaction('dislike')
      }
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (_) {}
  }

  async function toggleLike() {
    if (liking) return
    setLiking(true)
    try {
      if (rec.liked) {
        const { data } = await unlikeRecommendation(rec.id)
        setRec(r => ({ ...r, liked: false, likeId: null, likeCount: data.likeCount }))
        setShowTags(false)
      } else {
        const { data } = await likeRecommendation(rec.id)
        setRec(r => ({ ...r, liked: true, likeId: data.likeId, likeCount: data.likeCount }))
        setShowTags(true)
      }
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (_) {}
    setLiking(false)
  }

  return (
    <div className={`bg-[#1a1a1a] rounded-2xl p-4 hover:bg-[#222] transition-colors ${dislikeActive ? 'opacity-50' : ''}`}>
      <div className="flex gap-4">
        {/* Album art */}
        <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-[#282828] shadow-md">
          {rec.song.albumArtUrl
            ? <img src={rec.song.albumArtUrl} alt={rec.song.album} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center">
                <Music size={20} className="text-[#B3B3B3]" />
              </div>
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate leading-snug">{rec.song.title}</p>
          <p className="text-[#B3B3B3] text-xs truncate mb-1">{rec.song.artist}</p>
          <p className="text-[#B3B3B3] text-xs">
            from{' '}
            <span className="text-white font-medium">{rec.sender.displayName}</span>
            <span className="text-[#535353]"> · {formatDate(rec.sentAt)}</span>
          </p>
          {rec.context && (
            <p className="text-white/75 text-[13px] mt-2 bg-[#282828] rounded-lg px-3 py-2 leading-relaxed italic">
              "{rec.context}"
            </p>
          )}
        </div>

        {/* Actions — play on top, like below */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            onClick={() => player.toggle(rec.song)}
            disabled={!rec.song.previewUrl}
            title={rec.song.previewUrl ? (playing ? 'Pause' : 'Play 30s preview') : 'No preview available'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              rec.song.previewUrl
                ? playing
                  ? 'bg-[#1DB954] text-black hover:bg-[#1ed760]'
                  : 'bg-[#282828] text-white hover:bg-[#3e3e3e]'
                : 'bg-[#1a1a1a] text-[#535353] cursor-not-allowed'
            }`}
          >
            {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>

          <button
            onClick={toggleLike}
            disabled={liking || anyReaction}
            title={rec.liked ? 'Unlike' : 'Like'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              rec.liked
                ? 'text-[#1DB954] hover:text-red-400'
                : anyReaction
                  ? 'text-[#333] cursor-not-allowed'
                  : 'text-[#B3B3B3] hover:text-white'
            } ${liking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart size={16} fill={rec.liked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {tagPickerOpen && (
        <FeedbackTags likeId={rec.likeId} />
      )}

      {/* Bottom row — Not for me (left) · Not my vibe (right) */}
      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
        {/* Not for me — white when active, disabled when liked/dislike active/tag picker open */}
        <button
          onClick={handleDismiss}
          disabled={rec.liked || dislikeActive || tagPickerOpen}
          className={`text-[10px] font-medium transition-colors ${
            dismissActive
              ? 'text-white'
              : rec.liked || dislikeActive || tagPickerOpen
                ? 'text-[#333] cursor-not-allowed'
                : 'text-[#535353] hover:text-[#B3B3B3]'
          }`}
        >
          Not for me
        </button>

        {/* Not my vibe — red when active, disabled when liked/dismiss active/tag picker open */}
        <button
          onClick={handleDislike}
          disabled={rec.liked || dismissActive || tagPickerOpen}
          className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
            dislikeActive
              ? 'text-red-400'
              : rec.liked || dismissActive || tagPickerOpen
                ? 'text-[#333] cursor-not-allowed'
                : 'text-[#535353] hover:text-red-400'
          }`}
        >
          <ThumbsDown size={10} fill={dislikeActive ? 'currentColor' : 'none'} />
          Not my vibe
        </button>
      </div>
    </div>
  )
}

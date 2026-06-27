import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Play, Pause, Heart, Music, Users, ChevronRight, ThumbsDown } from 'lucide-react'
import { getGroupFeed, likeGroupRec, unlikeGroupRec } from '../phase5/api/groups'
import { dislikeSong } from '../phase4/api/likes'
import { usePlayer } from '../context/PlayerContext'
import GroupMembersSheet from '../components/GroupMembersSheet'

function formatTime(iso) {
  const d    = new Date(iso)
  const diff = (Date.now() - d) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function GroupMessage({ msg, onLikeToggle, onDislike }) {
  const player   = usePlayer()
  const active   = player.isActive(msg.song)
  const playing  = active && player.playing
  const me       = JSON.parse(localStorage.getItem('user') || '{}')
  const isMe     = msg.sender?.id === me.id
  const [disliked, setDisliked]   = useState(false)
  const [notForMe, setNotForMe]   = useState(false)

  async function handleDislike() {
    try {
      await onDislike(msg.song.spotifyId)
      setDisliked(true)
    } catch (_) {}
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-[#535353] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mr-2 mt-1">
          {msg.sender?.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className={`max-w-[68%] rounded-2xl p-3 ${
        isMe ? 'bg-purple-600/20 rounded-tr-sm' : 'bg-[#282828] rounded-tl-sm'
      } ${disliked ? 'opacity-60' : ''}`}>
        {!isMe && (
          <p className="text-purple-400 text-[10px] font-bold mb-1.5">{msg.sender?.displayName}</p>
        )}

        {/* Song */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-[#3e3e3e]">
            {msg.song.albumArtUrl
              ? <img src={msg.song.albumArtUrl} alt={msg.song.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-[#B3B3B3]" /></div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">{msg.song.title}</p>
            <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{msg.song.artist}</p>
          </div>
          {msg.song.previewUrl && (
            <button
              onClick={() => player.toggle(msg.song)}
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                playing ? 'bg-purple-500 text-white' : 'bg-[#3e3e3e] text-white hover:bg-[#535353]'
              }`}
            >
              {playing ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
            </button>
          )}
        </div>

        {msg.context && (
          <p className="text-white/60 text-xs italic mt-2 leading-relaxed">"{msg.context}"</p>
        )}

        {/* Timestamp */}
        <p className="text-[#535353] text-[9px] mt-1.5 text-right">{formatTime(msg.sentAt)}</p>

        {/* Like + dislike row — only for others' messages */}
        {!isMe && (
          <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between">
            {/* Left: Not for me (local only) */}
            {notForMe ? (
              <span className="text-[10px] text-[#535353]">Not for me</span>
            ) : (
              <button
                onClick={() => setNotForMe(true)}
                disabled={disliked}
                className={`text-[10px] transition-colors ${
                  disliked ? 'text-[#333] cursor-not-allowed' : 'text-[#535353] hover:text-[#B3B3B3]'
                }`}
              >
                Not for me
              </button>
            )}

            <div className="flex items-center gap-2">
              {/* Right: thumbs down */}
              {disliked ? (
                <span className="flex items-center gap-1 text-[10px] text-[#535353]">
                  <ThumbsDown size={9} /> Not my vibe
                </span>
              ) : (
                <button
                  onClick={handleDislike}
                  disabled={notForMe}
                  className={`flex items-center gap-1 text-[10px] transition-colors ${
                    notForMe ? 'text-[#333] cursor-not-allowed' : 'text-[#535353] hover:text-red-400'
                  }`}
                >
                  <ThumbsDown size={9} />
                </button>
              )}

              {/* Like */}
              <button
                onClick={() => !disliked && onLikeToggle(msg)}
                disabled={disliked}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  msg.liked ? 'text-purple-400' : 'text-[#B3B3B3] hover:text-white'
                } ${disliked ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Heart size={10} fill={msg.liked ? 'currentColor' : 'none'} />
                {msg.likeCount > 0 && <span>{msg.likeCount}</span>}
              </button>
            </div>
          </div>
        )}

        {/* Like count row for own messages */}
        {isMe && msg.likeCount > 0 && (
          <div className="mt-1 flex items-center justify-end gap-1">
            <Heart size={9} className="text-purple-400" fill="currentColor" />
            <span className="text-[9px] text-purple-400">{msg.likeCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GroupConversationView({ group, onBack }) {
  const [messages, setMessages]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [liking, setLiking]           = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    getGroupFeed(group.id)
      .then(({ data }) => setMessages([...(data ?? [])].reverse())   )
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [group.id])

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, messages.length])

  async function handleLikeToggle(msg) {
    if (liking === msg.id) return
    setLiking(msg.id)
    try {
      if (msg.liked) {
        await unlikeGroupRec(group.id, msg.id)
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, liked: false, likeCount: Math.max(0, m.likeCount - 1) } : m
        ))
      } else {
        await likeGroupRec(group.id, msg.id)
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, liked: true, likeCount: m.likeCount + 1 } : m
        ))
      }
    } catch (_) {}
    setLiking(null)
  }

  async function handleDislike(spotifyId) {
    await dislikeSong(spotifyId)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0 bg-[#121212]">
        <button onClick={onBack} className="text-[#B3B3B3] hover:text-white transition-colors p-1 -ml-1">
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => setShowMembers(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center flex-shrink-0">
            <Users size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">{group.name}</p>
            <p className="text-[#B3B3B3] text-xs">
              {group.memberCount ?? group._count?.members ?? 0} members · tap to see
            </p>
          </div>
          <ChevronRight size={14} className="text-[#535353] flex-shrink-0 ml-auto" />
        </button>
      </div>

      {showMembers && (
        <GroupMembersSheet group={group} onClose={() => setShowMembers(false)} />
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
            <Users size={40} className="text-[#535353] mb-3" />
            <p className="text-white font-semibold mb-1">No songs shared yet</p>
            <p className="text-[#B3B3B3] text-sm">Be the first to share a song with {group.name}</p>
          </div>
        ) : (
          <>
            <p className="text-center text-[#535353] text-[10px] uppercase tracking-widest mb-6">
              {group.name} · {messages.length} song{messages.length !== 1 ? 's' : ''}
            </p>
            {messages.map(msg => (
              <GroupMessage
                key={msg.id}
                msg={msg}
                onLikeToggle={handleLikeToggle}
                onDislike={handleDislike}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  )
}

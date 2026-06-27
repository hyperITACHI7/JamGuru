import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Play, Pause, Heart, Music, MessageCircle, Sparkles, Send, X, ChevronRight, ThumbsDown } from 'lucide-react'
import FriendProfileSheet from '../components/FriendProfileSheet'
import { getConversation, sendRecommendation } from '../phase3/api/recommendations'
import { likeRecommendation, unlikeRecommendation, dismissRecommendation, dislikeRecommendation } from '../phase4/api/likes'
import FeedbackTags from '../phase4/components/FeedbackTags'
import { usePlayer } from '../context/PlayerContext'
import { getAiSuggestion } from '../phase7/api/ai'

function formatTime(iso) {
  const d    = new Date(iso)
  const diff = (Date.now() - d) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Bubble({ msg, onLike, justLiked }) {
  const player  = usePlayer()
  const active  = player.isActive(msg.song)
  const playing = active && player.playing
  const isSent  = msg.direction === 'sent'
  const [reaction, setReaction] = useState(msg.dismissed ? 'dismiss' : null)

  async function handleDismiss() {
    try {
      await dismissRecommendation(msg.id)
      setReaction('dismiss')
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (_) {}
  }

  async function handleDislike() {
    try {
      await dislikeRecommendation(msg.id)
      setReaction('dislike')
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (_) {}
  }

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      <div className={`max-w-[72%] rounded-2xl p-3 ${
        isSent ? 'bg-[#1DB954]/15 rounded-tr-sm' : 'bg-[#282828] rounded-tl-sm'
      } ${reaction === 'dislike' ? 'opacity-60' : ''}`}>

        {/* Song row */}
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
                playing ? 'bg-[#1DB954] text-black' : 'bg-[#3e3e3e] text-white hover:bg-[#535353]'
              }`}
            >
              {playing
                ? <Pause size={10} fill="currentColor" />
                : <Play  size={10} fill="currentColor" />
              }
            </button>
          )}
        </div>

        {/* Context note */}
        {msg.context && (
          <p className="text-white/60 text-xs italic mt-2 leading-relaxed">"{msg.context}"</p>
        )}

        {/* SENT rec: show recipient's reaction — liked, not for me, or pending */}
        {isSent && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`flex items-center gap-1 text-[10px] font-medium ${
              msg.liked ? 'text-[#1DB954]' : msg.dismissed ? 'text-[#535353]' : 'text-[#535353]'
            }`}>
              {msg.liked
                ? <><Heart size={9} fill="currentColor" /> Loved it</>
                : msg.dismissed
                  ? <><ThumbsDown size={9} /> Not for me</>
                  : <><Heart size={9} fill="none" /> Not liked yet</>
              }
            </span>
            {msg.tags.map(tag => (
              <span key={tag} className="text-[9px] bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded-full font-semibold">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* RECEIVED rec: like + dismiss/dislike actions */}
        {!isSent && (
          <div className="mt-2">
            {/* Previously saved tags */}
            {msg.liked && !justLiked && msg.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {msg.tags.map(tag => (
                  <span key={tag} className="text-[9px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {/* Tag picker — shown right after liking */}
            {justLiked && msg.likeId && (
              <FeedbackTags likeId={msg.likeId} />
            )}

            {reaction ? (
              <p className="flex items-center gap-1 text-[10px] text-[#535353]">
                {reaction === 'dislike'
                  ? <><ThumbsDown size={9} /> Not my vibe</>
                  : 'Not for me'
                }
              </p>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => onLike(msg)}
                  className={`flex items-center gap-1 text-[10px] transition-colors ${
                    msg.liked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <Heart size={10} fill={msg.liked ? 'currentColor' : 'none'} />
                  {msg.liked ? 'Liked' : 'Like this rec'}
                </button>
                {!msg.liked && (
                  <>
                    <span className="text-[#333] text-[9px]">·</span>
                    <button
                      onClick={handleDislike}
                      className="flex items-center gap-1 text-[10px] text-[#535353] hover:text-red-400 transition-colors"
                    >
                      <ThumbsDown size={9} /> Not my vibe
                    </button>
                    <span className="text-[#333] text-[9px]">·</span>
                    <button
                      onClick={handleDismiss}
                      className="text-[10px] text-[#535353] hover:text-[#B3B3B3] transition-colors"
                    >
                      Not for me
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-[#535353] text-[9px] mt-1.5 text-right">{formatTime(msg.sentAt)}</p>
      </div>
    </div>
  )
}

export default function ConversationView({ friend, onBack }) {
  const [messages, setMessages]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [liking, setLiking]             = useState(null)
  const [justLikedIds, setJustLikedIds] = useState(new Set())

  // AI suggest compose state
  const [suggesting, setSuggesting]     = useState(false)
  const [suggested, setSuggested]       = useState(null)  // { song, aiQuery }
  const [suggestNote, setSuggestNote]   = useState('')
  const [sending, setSending]           = useState(false)
  const [suggestError, setSuggestError] = useState('')

  const bottomRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setJustLikedIds(new Set())
    getConversation(friend.id)
      .then(({ data }) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [friend.id])

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, messages.length])

  async function handleLike(msg) {
    if (liking === msg.id) return
    setLiking(msg.id)
    try {
      if (msg.liked) {
        await unlikeRecommendation(msg.id)
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, liked: false, likeId: null, tags: [] } : m
        ))
        setJustLikedIds(prev => { const s = new Set(prev); s.delete(msg.id); return s })
      } else {
        const { data } = await likeRecommendation(msg.id)
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, liked: true, likeId: data.likeId } : m
        ))
        setJustLikedIds(prev => new Set([...prev, msg.id]))
        window.dispatchEvent(new CustomEvent('jam:like'))
      }
    } catch (_) {}
    setLiking(null)
  }

  async function handleAiSuggest() {
    setSuggesting(true)
    setSuggestError('')
    setSuggested(null)
    try {
      const { data } = await getAiSuggestion(friend.id)
      setSuggested(data)
    } catch (e) {
      setSuggestError(e.response?.data?.error || 'AI suggestion failed. Try again.')
    } finally {
      setSuggesting(false)
    }
  }

  async function handleSendSuggested() {
    if (!suggested) return
    setSending(true)
    try {
      await sendRecommendation({
        songId:      suggested.song.spotifyId,
        recipientId: friend.id,
        context:     suggestNote.trim() || undefined,
      })
      const { data } = await getConversation(friend.id)
      setMessages(data)
      setSuggested(null)
      setSuggestNote('')
    } catch (e) {
      setSuggestError(e.response?.data?.error || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  const initial = friend.displayName?.[0]?.toUpperCase() ?? '?'
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0 bg-[#121212]">
        <button onClick={onBack} className="text-[#B3B3B3] hover:text-white transition-colors p-1 -ml-1">
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">{friend.displayName}</p>
            <p className="text-[#B3B3B3] text-xs">@{friend.username}</p>
          </div>
          <ChevronRight size={14} className="text-[#535353] flex-shrink-0 ml-auto" />
        </button>
      </div>

      {showProfile && (
        <FriendProfileSheet friend={friend} onClose={() => setShowProfile(false)} />
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
            <MessageCircle size={40} className="text-[#535353] mb-3" />
            <p className="text-white font-semibold mb-1">No songs shared yet</p>
            <p className="text-[#B3B3B3] text-sm">
              Share a song with {friend.displayName} to start the conversation
            </p>
          </div>
        ) : (
          <>
            <p className="text-center text-[#535353] text-[10px] uppercase tracking-widest mb-6">
              Your conversation with {friend.displayName}
            </p>
            {messages.map(msg => (
              <Bubble
                key={msg.id}
                msg={msg}
                onLike={handleLike}
                justLiked={justLikedIds.has(msg.id)}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* AI suggest compose bar — pinned to bottom */}
      <div className="flex-shrink-0 border-t border-white/5 bg-[#181818] px-4 py-3">
        {suggested ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-[#282828] rounded-xl p-2.5">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-[#3e3e3e]">
                {suggested.song.albumArtUrl
                  ? <img src={suggested.song.albumArtUrl} alt={suggested.song.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-[#B3B3B3]" /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{suggested.song.title}</p>
                <p className="text-[#B3B3B3] text-[10px] truncate">{suggested.song.artist}</p>
              </div>
              <span className="text-[#1DB954] text-[9px] font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                <Sparkles size={9} /> AI pick
              </span>
              <button onClick={() => { setSuggested(null); setSuggestNote('') }} className="text-[#535353] hover:text-white transition-colors ml-1">
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={suggestNote}
                onChange={e => setSuggestNote(e.target.value.slice(0, 200))}
                placeholder={`Add a note for ${friend.displayName}… (optional)`}
                className="flex-1 bg-[#282828] text-white text-xs rounded-full px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1DB954]/50 placeholder-[#535353]"
              />
              <button
                onClick={handleSendSuggested}
                disabled={sending}
                className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-[#1ed760] transition-colors"
              >
                <Send size={13} className="text-black fill-black" />
              </button>
            </div>
            {suggestError && <p className="text-red-400 text-[10px]">{suggestError}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[#535353] text-xs">Share a song with {friend.displayName}</p>
            <button
              onClick={handleAiSuggest}
              disabled={suggesting}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#1DB954] hover:text-[#1ed760] transition-colors disabled:opacity-50"
            >
              <Sparkles size={12} className={suggesting ? 'animate-pulse' : ''} />
              {suggesting ? 'Finding perfect song…' : 'AI Suggest'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

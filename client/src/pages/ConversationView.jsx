import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, Play, Pause, Heart, Music, MessageCircle, Sparkles, Send, X,
  ChevronRight, ThumbsDown, Plus, Search, ChevronLeft, ListMusic, HelpCircle, Reply,
} from 'lucide-react'
import FriendProfileSheet from '../components/FriendProfileSheet'
import { getConversation, sendRecommendation } from '../phase3/api/recommendations'
import {
  likeRecommendation, unlikeRecommendation,
  dismissRecommendation, undismissRecommendation,
  dislikeRecommendation, undislikeRecommendation,
} from '../phase4/api/likes'
import { getLikedSongs, searchSongs } from '../api/songs'
import { getPlaylists, getPlaylist } from '../api/auth'
import { sendSongRequest } from '../api/songRequests'
import { REQUEST_TEMPLATES, renderTemplate } from '../data/requestTemplates'
import { rankForRequest } from '../phase7/api/ai'
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

function renderTemplateWithPills(templateId, vars, cycleVar) {
  const tmpl = REQUEST_TEMPLATES.find(t => t.id === templateId)
  if (!tmpl) return null
  const parts = tmpl.template.split(/(\{[^}]+\})/)
  return parts.map((part, i) => {
    const match = part.match(/^\{(\w+)\}$/)
    if (!match) return <span key={i}>{part}</span>
    const key = match[1]
    const ph  = tmpl.placeholders[key]
    return (
      <button key={i} onClick={() => cycleVar(key, ph.options)}
        className="inline-flex items-center gap-1 bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-xs font-semibold px-2 py-0.5 rounded-full hover:bg-[#1DB954]/30 transition-colors">
        {vars[key]} <ChevronRight size={9} />
      </button>
    )
  })
}

function Bubble({ msg, onLike, justLiked, requestText }) {
  const player  = usePlayer()
  const active  = player.isActive(msg.song)
  const playing = active && player.playing
  const isSent  = msg.direction === 'sent'
  const isReply = !!msg.requestId
  const [reaction, setReaction] = useState(msg.dismissed ? 'dismiss' : null)

  const tagPickerOpen = justLiked && !!msg.likeId
  const dismissActive = reaction === 'dismiss'
  const dislikeActive = reaction === 'dislike'
  const anyReaction   = dismissActive || dislikeActive

  async function handleDismiss() {
    try {
      if (dismissActive) { await undismissRecommendation(msg.id); setReaction(null) }
      else               { await dismissRecommendation(msg.id);   setReaction('dismiss') }
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (_) {}
  }

  async function handleDislike() {
    try {
      if (dislikeActive) { await undislikeRecommendation(msg.id); setReaction(null) }
      else               { await dislikeRecommendation(msg.id);   setReaction('dislike') }
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (_) {}
  }

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      <div className={`max-w-[72%] rounded-2xl p-3 ${
        isSent
          ? isReply ? 'bg-[#1DB954]/20 rounded-tr-sm' : 'bg-[#1DB954]/15 rounded-tr-sm'
          : isReply ? 'bg-[#2e2e2e] rounded-tl-sm' : 'bg-[#282828] rounded-tl-sm'
      } ${dislikeActive ? 'opacity-60' : ''}`}>

        {/* Reply quote block — WhatsApp / Instagram style */}
        {isReply && requestText && (
          <div className={`flex items-start gap-1.5 mb-2.5 pl-2 border-l-2 rounded-r-md py-1 pr-2 ${
            isSent ? 'border-black/30 bg-black/10' : 'border-[#1DB954]/50 bg-[#1DB954]/5'
          }`}>
            <Reply size={9} className={`flex-shrink-0 mt-0.5 ${isSent ? 'text-black/40' : 'text-[#1DB954]/60'}`} />
            <div className="min-w-0">
              <p className={`text-[8px] font-bold uppercase tracking-wider ${isSent ? 'text-black/40' : 'text-[#1DB954]/70'}`}>
                song request
              </p>
              <p className={`text-[9px] truncate italic ${isSent ? 'text-black/40' : 'text-white/40'}`}>
                "{requestText}"
              </p>
            </div>
          </div>
        )}

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

          {!isSent ? (
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {msg.song.previewUrl && (
                <button onClick={() => player.toggle(msg.song)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    playing ? 'bg-[#1DB954] text-black' : 'bg-[#3e3e3e] text-white hover:bg-[#535353]'
                  }`}>
                  {playing ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                </button>
              )}
              <button onClick={() => onLike(msg)} disabled={anyReaction}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  msg.liked ? 'text-[#1DB954] hover:text-red-400'
                    : anyReaction ? 'text-[#333] cursor-not-allowed'
                    : 'text-[#B3B3B3] hover:text-white'
                }`}>
                <Heart size={14} fill={msg.liked ? 'currentColor' : 'none'} />
              </button>
            </div>
          ) : (
            msg.song.previewUrl && (
              <button onClick={() => player.toggle(msg.song)}
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  playing ? 'bg-[#1DB954] text-black' : 'bg-[#3e3e3e] text-white hover:bg-[#535353]'
                }`}>
                {playing ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              </button>
            )
          )}
        </div>

        {msg.context && <p className="text-white/60 text-xs italic mt-2 leading-relaxed">"{msg.context}"</p>}

        {isSent && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`flex items-center gap-1 text-[10px] font-medium ${msg.liked ? 'text-[#1DB954]' : 'text-[#535353]'}`}>
              {msg.liked ? <><Heart size={9} fill="currentColor" /> Loved it</>
                : msg.dismissed ? <><ThumbsDown size={9} /> Not for me</>
                : <><Heart size={9} fill="none" /> Not liked yet</>}
            </span>
            {msg.tags.map(tag => (
              <span key={tag} className="text-[9px] bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded-full font-semibold">{tag}</span>
            ))}
          </div>
        )}

        {!isSent && (
          <>
            {msg.liked && !justLiked && msg.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-1">
                {msg.tags.map(tag => (
                  <span key={tag} className="text-[9px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full font-semibold">{tag}</span>
                ))}
              </div>
            )}
            {tagPickerOpen && <FeedbackTags likeId={msg.likeId} />}

            <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
              <button onClick={handleDismiss} disabled={msg.liked || dislikeActive || tagPickerOpen}
                className={`text-[10px] font-medium transition-colors ${
                  dismissActive ? 'text-white'
                    : msg.liked || dislikeActive || tagPickerOpen ? 'text-[#333] cursor-not-allowed'
                    : 'text-[#535353] hover:text-[#B3B3B3]'
                }`}>Not for me</button>
              <button onClick={handleDislike} disabled={msg.liked || dismissActive || tagPickerOpen}
                className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
                  dislikeActive ? 'text-red-400'
                    : msg.liked || dismissActive || tagPickerOpen ? 'text-[#333] cursor-not-allowed'
                    : 'text-[#535353] hover:text-red-400'
                }`}>
                <ThumbsDown size={9} fill={dislikeActive ? 'currentColor' : 'none'} />
                Not my vibe
              </button>
            </div>
          </>
        )}

        <p className="text-[#535353] text-[9px] mt-1.5 text-right">{formatTime(msg.sentAt)}</p>
      </div>
    </div>
  )
}

function RequestBubble({ msg, onPickSong }) {
  const isSent = msg.direction === 'sent'
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      <div className={`max-w-[72%] rounded-2xl p-3 ${
        isSent ? 'bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-tr-sm' : 'bg-[#282828] rounded-tl-sm'
      }`}>
        <div className="flex items-center gap-1.5 mb-2">
          <Music size={10} className="text-[#1DB954]" />
          <span className="text-[#1DB954] text-[9px] font-bold uppercase tracking-wider">Song Request</span>
        </div>
        <p className="text-white text-xs leading-relaxed">"{msg.renderedText}"</p>
        {isSent ? (
          <p className={`text-[10px] mt-2 font-medium ${msg.status === 'FULFILLED' ? 'text-[#1DB954]' : 'text-[#535353]'}`}>
            {msg.status === 'FULFILLED' ? '✓ Song sent' : '● Waiting for a pick…'}
          </p>
        ) : (
          <>
            {msg.status === 'OPEN' && (
              <button onClick={onPickSong}
                className="mt-2 flex items-center gap-1 text-[#1DB954] text-[10px] font-semibold hover:text-[#1ed760] transition-colors">
                Pick a song <ChevronRight size={10} />
              </button>
            )}
            {msg.status === 'FULFILLED' && (
              <p className="text-[#535353] text-[10px] mt-2">Song sent ✓</p>
            )}
          </>
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

  // Compose: AI suggest / library pick
  const [suggesting, setSuggesting]     = useState(false)
  const [suggested, setSuggested]       = useState(null)
  const [suggestNote, setSuggestNote]   = useState('')
  const [sending, setSending]           = useState(false)
  const [suggestError, setSuggestError] = useState('')

  // Library picker — two-level: playlists → songs
  const [showLibrary, setShowLibrary]           = useState(false)
  const [libraryView, setLibraryView]           = useState('playlists')
  const [playlists, setPlaylists]               = useState([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [activePlaylist, setActivePlaylist]     = useState(null)
  const [librarySongs, setLibrarySongs]         = useState([])
  const [libraryLoading, setLibraryLoading]     = useState(false)
  const [librarySearch, setLibrarySearch]       = useState('')

  // Song request composer
  const [showRequest, setShowRequest]           = useState(false)
  const [requestStep, setRequestStep]           = useState('templates')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [requestVars, setRequestVars]           = useState({})
  const [sendingRequest, setSendingRequest]     = useState(false)
  const [requestError, setRequestError]         = useState('')
  const [pendingRequestId, setPendingRequestId] = useState(null)

  // Request reply picker
  const [showReplyPicker, setShowReplyPicker]     = useState(false)
  const [replyPickerLoading, setReplyPickerLoading] = useState(false)
  const [replyPickerPicks, setReplyPickerPicks]   = useState([])
  const [replyPickerRemaining, setReplyPickerRemaining] = useState([])
  const [replySearch, setReplySearch]             = useState('')
  const [replySearchResults, setReplySearchResults] = useState([])
  const [replySearchLoading, setReplySearchLoading] = useState(false)
  const [activeRequestText, setActiveRequestText] = useState('')

  const bottomRef  = useRef(null)
  const searchRef  = useRef(null)
  const replySearchRef = useRef(null)
  const replySearchTimer = useRef(null)

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

  useEffect(() => {
    if (showLibrary) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showLibrary, libraryView])

  useEffect(() => {
    if (showReplyPicker) setTimeout(() => replySearchRef.current?.focus(), 80)
  }, [showReplyPicker])

  // ── Library picker ──────────────────────────────────────────
  async function openLibrary() {
    setShowRequest(false)
    setShowReplyPicker(false)
    setShowLibrary(true)
    setLibraryView('playlists')
    setLibrarySearch('')
    setActivePlaylist(null)
    setLibrarySongs([])
    if (playlists.length === 0) {
      setPlaylistsLoading(true)
      try {
        const { data } = await getPlaylists()
        setPlaylists(data.playlists || [])
      } catch (_) {}
      setPlaylistsLoading(false)
    }
  }

  async function selectPlaylist(playlist) {
    setActivePlaylist(playlist)
    setLibraryView('songs')
    setLibrarySearch('')
    setLibraryLoading(true)
    try {
      if (playlist.type === 'liked') {
        const { data } = await getLikedSongs()
        setLibrarySongs(data.songs || [])
      } else {
        const { data } = await getPlaylist(playlist.id)
        setLibrarySongs((data.playlist?.songs || []).map(ps => ps.song))
      }
    } catch (_) {}
    setLibraryLoading(false)
  }

  function backToPlaylists() {
    setLibraryView('playlists')
    setLibrarySearch('')
    setActivePlaylist(null)
    setLibrarySongs([])
  }

  function selectSong(song) {
    setSuggested({ song })
    setSuggestNote('')
    setSuggestError('')
    setShowLibrary(false)
    setShowReplyPicker(false)
    setLibrarySearch('')
    setLibraryView('playlists')
    setReplySearch('')
    setReplySearchResults([])
  }

  const filteredLibrary = librarySearch.trim()
    ? (libraryView === 'playlists'
        ? playlists.filter(p => p.name.toLowerCase().includes(librarySearch.toLowerCase()))
        : librarySongs.filter(s =>
            s.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
            s.artist.toLowerCase().includes(librarySearch.toLowerCase())
          )
      )
    : libraryView === 'playlists' ? playlists : librarySongs

  // ── Request reply picker ────────────────────────────────────
  async function handlePickSongForRequest(requestId, requestText) {
    setPendingRequestId(requestId)
    setActiveRequestText(requestText || '')
    setShowReplyPicker(true)
    setShowLibrary(false)
    setShowRequest(false)
    setReplySearch('')
    setReplySearchResults([])
    setReplyPickerPicks([])
    setReplyPickerRemaining([])
    setReplyPickerLoading(true)
    try {
      const { data } = await rankForRequest(requestId)
      setReplyPickerPicks(data.picks || [])
      setReplyPickerRemaining(data.remaining || [])
    } catch (_) {
      // AI failed — fall back to full liked songs list
      try {
        const { data } = await getLikedSongs()
        setReplyPickerRemaining(data.songs || [])
      } catch (__) {}
    }
    setReplyPickerLoading(false)
  }

  function handleReplySearchChange(q) {
    setReplySearch(q)
    if (!q.trim()) { setReplySearchResults([]); return }
    clearTimeout(replySearchTimer.current)
    replySearchTimer.current = setTimeout(async () => {
      setReplySearchLoading(true)
      try {
        const { data } = await searchSongs(q)
        setReplySearchResults(data.songs || [])
      } catch (_) {}
      setReplySearchLoading(false)
    }, 400)
  }

  // ── Song request composer ───────────────────────────────────
  function openRequestComposer() {
    setShowRequest(true)
    setShowLibrary(false)
    setShowReplyPicker(false)
    setRequestStep('templates')
    setSelectedTemplate(null)
    setRequestVars({})
    setRequestError('')
  }

  function selectTemplate(tmpl) {
    const vars = {}
    Object.entries(tmpl.placeholders).forEach(([key, ph]) => { vars[key] = ph.options[0] })
    setSelectedTemplate(tmpl.id)
    setRequestVars(vars)
    setRequestStep('customize')
  }

  function cycleVar(key, options) {
    setRequestVars(prev => {
      const idx = options.indexOf(prev[key])
      return { ...prev, [key]: options[(idx + 1) % options.length] }
    })
  }

  async function handleSendRequest() {
    const tmpl = REQUEST_TEMPLATES.find(t => t.id === selectedTemplate)
    if (!tmpl) return
    const renderedText = renderTemplate(selectedTemplate, requestVars)
    setSendingRequest(true)
    setRequestError('')
    try {
      await sendSongRequest({ recipientId: friend.id, templateId: selectedTemplate, variables: requestVars, renderedText })
      const { data } = await getConversation(friend.id)
      setMessages(data)
      setShowRequest(false)
      setRequestStep('templates')
      setSelectedTemplate(null)
      setRequestVars({})
    } catch (e) {
      setRequestError(e.response?.data?.error || 'Failed to send request.')
    } finally {
      setSendingRequest(false)
    }
  }

  // ── Like handler ────────────────────────────────────────────
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

  async function handleSend() {
    if (!suggested) return
    setSending(true)
    try {
      await sendRecommendation({
        songId:      suggested.song.spotifyId,
        recipientId: friend.id,
        context:     suggestNote.trim() || undefined,
        requestId:   pendingRequestId ?? undefined,
      })
      const { data } = await getConversation(friend.id)
      setMessages(data)
      setSuggested(null)
      setSuggestNote('')
      setPendingRequestId(null)
    } catch (e) {
      setSuggestError(e.response?.data?.error || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  const initial = friend.displayName?.[0]?.toUpperCase() ?? '?'
  const [showProfile, setShowProfile] = useState(false)

  // Build a lookup map: requestId → renderedText for reply quotes
  const requestTextMap = {}
  messages.forEach(m => { if (m.type === 'request') requestTextMap[m.id] = m.renderedText })

  // Songs to show in reply picker when not searching
  const replyPickerHasAiPicks = replyPickerPicks.length > 0
  const replyPickerAllLibrary = [...replyPickerPicks, ...replyPickerRemaining]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0 bg-[#121212]">
        <button onClick={onBack} className="text-[#B3B3B3] hover:text-white transition-colors p-1 -ml-1">
          <ArrowLeft size={18} />
        </button>
        <button onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
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

      {showProfile && <FriendProfileSheet friend={friend} onClose={() => setShowProfile(false)} />}

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
            <p className="text-[#B3B3B3] text-sm">Share a song with {friend.displayName} to start the conversation</p>
          </div>
        ) : (
          <>
            <p className="text-center text-[#535353] text-[10px] uppercase tracking-widest mb-6">
              Your conversation with {friend.displayName}
            </p>
            {messages.map(msg =>
              msg.type === 'request'
                ? <RequestBubble key={msg.id} msg={msg}
                    onPickSong={() => handlePickSongForRequest(msg.id, msg.renderedText)} />
                : <Bubble key={msg.id} msg={msg} onLike={handleLike}
                    justLiked={justLikedIds.has(msg.id)}
                    requestText={msg.requestId ? requestTextMap[msg.requestId] : null} />
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Request reply picker panel ── */}
      {showReplyPicker && (
        <div className="flex-shrink-0 border-t border-white/5 bg-[#181818] flex flex-col" style={{ maxHeight: '340px' }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-[#1DB954] text-[9px] font-bold uppercase tracking-wider">Replying to</p>
              <p className="text-white/50 text-[10px] truncate italic">"{activeRequestText}"</p>
            </div>
            <button onClick={() => { setShowReplyPicker(false); setPendingRequestId(null) }}
              className="text-[#535353] hover:text-white transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#282828] rounded-full px-3 py-1.5">
              <Search size={12} className="text-[#535353] flex-shrink-0" />
              <input
                ref={replySearchRef}
                value={replySearch}
                onChange={e => handleReplySearchChange(e.target.value)}
                placeholder="Search Spotify or browse below…"
                className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder-[#535353]"
              />
              {replySearch && (
                <button onClick={() => { setReplySearch(''); setReplySearchResults([]) }}
                  className="text-[#535353] hover:text-white"><X size={11} /></button>
              )}
            </div>
          </div>

          {/* Song list */}
          <div className="overflow-y-auto flex-1">
            {replySearch.trim() ? (
              /* ── Spotify search results ── */
              replySearchLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : replySearchResults.length === 0 ? (
                <p className="text-center text-[#535353] text-xs py-6">No results</p>
              ) : (
                replySearchResults.map(song => (
                  <button key={song.spotifyId} onClick={() => selectSong(song)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                      {song.albumArtUrl
                        ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{song.title}</p>
                      <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                    </div>
                  </button>
                ))
              )
            ) : replyPickerLoading ? (
              /* ── AI loading ── */
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-5 h-5 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#535353] text-[10px]">Finding best matches…</p>
              </div>
            ) : (
              /* ── AI picks + remaining library ── */
              <>
                {replyPickerHasAiPicks && (
                  <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#1DB954]">
                    ✨ AI picks for this request
                  </p>
                )}
                {replyPickerPicks.map(song => (
                  <button key={song.spotifyId} onClick={() => selectSong(song)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                      {song.albumArtUrl
                        ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{song.title}</p>
                      <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                    </div>
                    {song.aiReason && (
                      <span className="text-[#535353] text-[9px] italic flex-shrink-0 max-w-[90px] text-right leading-tight">{song.aiReason}</span>
                    )}
                  </button>
                ))}

                {replyPickerRemaining.length > 0 && (
                  <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#535353] mt-1">
                    {replyPickerHasAiPicks ? 'More from your library' : 'Your library'}
                  </p>
                )}
                {replyPickerRemaining.map(song => (
                  <button key={song.spotifyId} onClick={() => selectSong(song)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                      {song.albumArtUrl
                        ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{song.title}</p>
                      <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                    </div>
                  </button>
                ))}

                {replyPickerAllLibrary.length === 0 && !replyPickerLoading && (
                  <p className="text-center text-[#535353] text-xs py-8">
                    No songs in your library — search Spotify above
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Song request composer panel ── */}
      {showRequest && (
        <div className="flex-shrink-0 border-t border-white/5 bg-[#181818] flex flex-col" style={{ maxHeight: '300px' }}>
          {requestStep === 'templates' ? (
            <>
              <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
                <span className="text-white text-xs font-semibold">Choose a template</span>
                <button onClick={() => setShowRequest(false)} className="text-[#535353] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-2">
                {REQUEST_TEMPLATES.map(tmpl => (
                  <button key={tmpl.id} onClick={() => selectTemplate(tmpl)}
                    className="w-full text-left bg-[#282828] hover:bg-[#333] rounded-xl p-3 transition-colors">
                    <p className="text-[#1DB954] text-[9px] font-bold uppercase tracking-wider mb-1">{tmpl.label}</p>
                    <p className="text-white text-xs leading-relaxed">
                      {tmpl.template.replace(/\{(\w+)\}/g, (_, k) => `[${tmpl.placeholders[k]?.label ?? k}]`)}
                    </p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-shrink-0">
                <button onClick={() => setRequestStep('templates')} className="text-[#B3B3B3] hover:text-white transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-white text-xs font-semibold flex-1">Customize your request</span>
                <button onClick={() => setShowRequest(false)} className="text-[#535353] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="px-4 py-2 flex-1 overflow-y-auto">
                <div className="text-white text-sm leading-loose flex flex-wrap items-center gap-x-1 gap-y-2">
                  {renderTemplateWithPills(selectedTemplate, requestVars, cycleVar)}
                </div>
                {requestError && <p className="text-red-400 text-[10px] mt-2">{requestError}</p>}
              </div>
              <div className="px-4 pb-4 pt-2 flex-shrink-0">
                <button onClick={handleSendRequest} disabled={sendingRequest}
                  className="w-full py-2.5 rounded-xl bg-[#1DB954] text-black text-sm font-bold disabled:opacity-50 hover:bg-[#1ed760] transition-colors">
                  {sendingRequest ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Library picker panel — two-level ── */}
      {showLibrary && (
        <div className="flex-shrink-0 border-t border-white/5 bg-[#181818] flex flex-col" style={{ maxHeight: '300px' }}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-shrink-0">
            {libraryView === 'songs' && (
              <button onClick={backToPlaylists} className="text-[#B3B3B3] hover:text-white transition-colors flex-shrink-0">
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex-1 flex items-center gap-2 bg-[#282828] rounded-full px-3 py-1.5">
              <Search size={12} className="text-[#535353] flex-shrink-0" />
              <input
                ref={searchRef}
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                placeholder={libraryView === 'playlists' ? 'Search playlists…' : `Search in ${activePlaylist?.name}…`}
                className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder-[#535353]"
              />
              {librarySearch && (
                <button onClick={() => setLibrarySearch('')} className="text-[#535353] hover:text-white">
                  <X size={11} />
                </button>
              )}
            </div>
            <button onClick={() => { setShowLibrary(false); setPendingRequestId(null) }}
              className="text-[#535353] hover:text-white transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {libraryView === 'playlists' && (
            <div className="overflow-y-auto flex-1">
              {playlistsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <button onClick={() => selectPlaylist({ type: 'liked', name: 'Liked Songs' })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <div className="w-10 h-10 flex-shrink-0 rounded-md bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center">
                      <Heart size={16} className="text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium">Liked Songs</p>
                      <p className="text-[#B3B3B3] text-[10px] mt-0.5">Your liked songs</p>
                    </div>
                    <ChevronRight size={14} className="text-[#535353] flex-shrink-0" />
                  </button>
                  {filteredLibrary.length === 0 && librarySearch ? (
                    <p className="text-center text-[#535353] text-xs py-4">No playlists match</p>
                  ) : (
                    filteredLibrary.map(pl => (
                      <button key={pl.id} onClick={() => selectPlaylist({ ...pl, type: 'playlist' })}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                          {pl.coverUrl
                            ? <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><ListMusic size={14} className="text-[#535353]" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{pl.name}</p>
                          <p className="text-[#B3B3B3] text-[10px] mt-0.5">{pl._count?.songs ?? 0} songs</p>
                        </div>
                        <ChevronRight size={14} className="text-[#535353] flex-shrink-0" />
                      </button>
                    ))
                  )}
                  {playlists.length === 0 && !playlistsLoading && !librarySearch && (
                    <p className="text-center text-[#535353] text-[10px] px-4 pb-4 pt-1">No imported playlists yet</p>
                  )}
                </>
              )}
            </div>
          )}

          {libraryView === 'songs' && (
            <div className="overflow-y-auto flex-1">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredLibrary.length === 0 ? (
                <p className="text-center text-[#535353] text-xs py-8">
                  {librarySearch ? 'No songs match' : 'This playlist is empty'}
                </p>
              ) : (
                filteredLibrary.map(song => (
                  <button key={song.spotifyId} onClick={() => selectSong(song)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                      {song.albumArtUrl
                        ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{song.title}</p>
                      <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Compose bar */}
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
              {suggested.aiQuery && (
                <span className="text-[#1DB954] text-[9px] font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                  <Sparkles size={9} /> AI pick
                </span>
              )}
              {pendingRequestId && (
                <span className="text-[#535353] text-[9px] flex-shrink-0 flex items-center gap-0.5">
                  <Reply size={8} /> reply
                </span>
              )}
              <button onClick={() => { setSuggested(null); setSuggestNote(''); setSuggestError(''); setPendingRequestId(null) }}
                className="text-[#535353] hover:text-white transition-colors ml-1">
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
              <button onClick={handleSend} disabled={sending}
                className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-[#1ed760] transition-colors">
                <Send size={13} className="text-black fill-black" />
              </button>
            </div>
            {suggestError && <p className="text-red-400 text-[10px]">{suggestError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-[#535353] text-xs flex-1 truncate">Share a song with {friend.displayName}</p>
            <button onClick={openLibrary} title="Pick from your library"
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                showLibrary ? 'bg-[#1DB954] text-black' : 'bg-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#3e3e3e]'
              }`}>
              <Plus size={15} />
            </button>
            <button onClick={openRequestComposer} title="Request a song"
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                showRequest ? 'bg-[#1DB954] text-black' : 'bg-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#3e3e3e]'
              }`}>
              <HelpCircle size={15} />
            </button>
            <button onClick={handleAiSuggest} disabled={suggesting}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#1DB954] hover:text-[#1ed760] transition-colors disabled:opacity-50 flex-shrink-0">
              <Sparkles size={12} className={suggesting ? 'animate-pulse' : ''} />
              {suggesting ? 'Finding…' : 'AI Suggest'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, Heart, Music, Users, ChevronRight, ThumbsDown,
  Sparkles, Send, X, Plus, Search, ChevronLeft, ListMusic, Reply,
} from 'lucide-react'
import {
  getGroupFeed, likeGroupRec, unlikeGroupRec,
  sendGroupRec, sendGroupRequest,
} from '../phase5/api/groups'
import { dislikeSong } from '../phase4/api/likes'
import { getLikedSongs, searchSongs } from '../api/songs'
import { getPlaylists, getPlaylist } from '../api/auth'
import { REQUEST_TEMPLATES, renderTemplate, joinTags } from '../data/requestTemplates'
import TagPicker from '../components/TagPicker'
import { getTaste } from '../api/taste'
import { getGroupAiSuggestion, rankForGroupRequest } from '../phase7/api/ai'
import { usePlayer } from '../context/PlayerContext'

function formatTime(iso) {
  const d    = new Date(iso)
  const diff = (Date.now() - d) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function renderTemplateWithPills(templateId, vars, openPicker) {
  const tmpl = REQUEST_TEMPLATES.find(t => t.id === templateId)
  if (!tmpl) return null
  const parts = tmpl.template.split(/(\{[^}]+\})/)
  return parts.map((part, i) => {
    const match = part.match(/^\{(\w+)\}$/)
    if (!match) return <span key={i}>{part}</span>
    const key  = match[1]
    const ph   = tmpl.placeholders[key]
    const tags = vars[key] ?? ['any']
    const display = tags.includes('any') ? `any ${ph?.label ?? key}` : joinTags(tags)
    return (
      <button key={i} onClick={() => openPicker(key)}
        className="inline-flex items-center gap-1 bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs font-semibold px-2 py-0.5 rounded-full hover:bg-purple-500/30 transition-colors max-w-[180px]">
        <span className="truncate">{display}</span>
        <ChevronRight size={9} className="flex-shrink-0" />
      </button>
    )
  })
}

function GroupMessage({ msg, onLikeToggle, requestText }) {
  const player  = usePlayer()
  const song    = msg.song ?? {}
  const sender  = msg.sender ?? { displayName: 'Deleted user' }
  const active  = player.isActive(msg.song)
  const playing = active && player.playing
  const me      = JSON.parse(localStorage.getItem('user') || '{}')
  const isMe    = sender.id === me.id
  const isReply = !!msg.groupRequestId

  // Single toggleable reaction state — mirrors DM Bubble pattern
  const [reaction, setReaction] = useState(null) // 'notForMe' | 'notMyVibe' | null
  const [apiDisliked, setApiDisliked] = useState(false) // guard: only call dislikeSong once

  const notForMeActive  = reaction === 'notForMe'
  const notMyVibeActive = reaction === 'notMyVibe'
  const anyReaction     = notForMeActive || notMyVibeActive

  function handleNotForMe() {
    setReaction(notForMeActive ? null : 'notForMe')
    window.dispatchEvent(new CustomEvent('jam:like'))
  }

  async function handleNotMyVibe() {
    const next = notMyVibeActive ? null : 'notMyVibe'
    setReaction(next)
    if (next === 'notMyVibe' && !apiDisliked) {
      try { await dislikeSong(msg.song.spotifyId); setApiDisliked(true) } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('jam:like'))
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-[#535353] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mr-2 mt-1">
          {sender.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className={`max-w-[68%] rounded-2xl p-3 ${
        isMe
          ? isReply ? 'bg-purple-600/25 rounded-tr-sm' : 'bg-purple-600/20 rounded-tr-sm'
          : isReply ? 'bg-[#2e2e2e] rounded-tl-sm' : 'bg-[#282828] rounded-tl-sm'
      } ${notMyVibeActive ? 'opacity-60' : ''}`}>

        {!isMe && (
          <p className="text-purple-400 text-[10px] font-bold mb-1.5">{sender.displayName}</p>
        )}

        {/* Reply quote block */}
        {isReply && requestText && (
          <div className={`flex items-start gap-1.5 mb-2.5 pl-2 border-l-2 rounded-r-md py-1 pr-2 ${
            isMe ? 'border-black/30 bg-black/10' : 'border-purple-500/50 bg-purple-500/5'
          }`}>
            <Reply size={9} className={`flex-shrink-0 mt-0.5 ${isMe ? 'text-black/40' : 'text-purple-400/60'}`} />
            <p className={`text-[11px] truncate italic min-w-0 ${isMe ? 'text-white' : 'text-white/75'}`}>
              "{requestText}"
            </p>
          </div>
        )}

        {/* Song row — play + heart column on the right for received, play only for sent */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-[#3e3e3e]">
            {song.albumArtUrl
              ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-[#B3B3B3]" /></div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">{song.title}</p>
            <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
          </div>

          {!isMe ? (
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {song.previewUrl && (
                <button onClick={() => player.toggle(msg.song)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    playing ? 'bg-purple-500 text-white' : 'bg-[#3e3e3e] text-white hover:bg-[#535353]'
                  }`}>
                  {playing ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                </button>
              )}
              <div className="flex items-center gap-1">
                {msg.likeCount > 0 && (
                  <span className={`text-[9px] font-medium ${msg.liked ? 'text-purple-400' : 'text-[#B3B3B3]'}`}>
                    {msg.likeCount}
                  </span>
                )}
                <button
                  onClick={() => !anyReaction && onLikeToggle(msg)}
                  disabled={anyReaction}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    msg.liked ? 'text-purple-400 hover:text-red-400'
                      : anyReaction ? 'text-[#333] cursor-not-allowed'
                      : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <Heart size={14} fill={msg.liked ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ) : (
            song.previewUrl && (
              <button onClick={() => player.toggle(msg.song)}
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  playing ? 'bg-purple-500 text-white' : 'bg-[#3e3e3e] text-white hover:bg-[#535353]'
                }`}>
                {playing ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              </button>
            )
          )}
        </div>

        {msg.context && <p className="text-white/60 text-xs italic mt-2 leading-relaxed">"{msg.context}"</p>}

        {/* Sent: show aggregate like count */}
        {isMe && msg.likeCount > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <Heart size={9} className="text-purple-400" fill="currentColor" />
            <span className="text-[9px] text-purple-400">{msg.likeCount} {msg.likeCount === 1 ? 'like' : 'likes'}</span>
          </div>
        )}

        {/* Received: reaction buttons — same layout as DM */}
        {!isMe && (
          <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
            <button onClick={handleNotForMe}
              disabled={msg.liked || notMyVibeActive}
              className={`text-[10px] font-medium transition-colors ${
                notForMeActive ? 'text-white'
                  : msg.liked || notMyVibeActive ? 'text-[#333] cursor-not-allowed'
                  : 'text-[#535353] hover:text-[#B3B3B3]'
              }`}>
              Not for me
            </button>
            <button onClick={handleNotMyVibe}
              disabled={msg.liked || notForMeActive}
              className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
                notMyVibeActive ? 'text-red-400'
                  : msg.liked || notForMeActive ? 'text-[#333] cursor-not-allowed'
                  : 'text-[#535353] hover:text-red-400'
              }`}>
              <ThumbsDown size={9} fill={notMyVibeActive ? 'currentColor' : 'none'} />
              Not my vibe
            </button>
          </div>
        )}

        <p className="text-[#535353] text-[9px] mt-1.5 text-right">{formatTime(msg.sentAt)}</p>
      </div>
    </div>
  )
}

function GroupRequestBubble({ msg, onPickSong }) {
  const me     = JSON.parse(localStorage.getItem('user') || '{}')
  const sender = msg.sender ?? { displayName: 'Deleted user' }
  const isMe   = msg.senderId === me.id
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-[#535353] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mr-2 mt-1">
          {sender.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className={`max-w-[68%] rounded-2xl p-3 ${
        isMe ? 'bg-purple-500/10 border border-purple-500/20 rounded-tr-sm' : 'bg-[#282828] rounded-tl-sm'
      }`}>
        {!isMe && (
          <p className="text-purple-400 text-[10px] font-bold mb-1.5">{sender.displayName}</p>
        )}
        <div className="flex items-center gap-1.5 mb-2">
          <Music size={10} className="text-purple-400" />
          <span className="text-purple-400 text-[9px] font-bold uppercase tracking-wider">Song Request</span>
        </div>
        <p className="text-white text-xs leading-relaxed">"{msg.renderedText}"</p>
        {isMe ? (
          <p className={`text-[10px] mt-2 font-medium ${msg.status === 'FULFILLED' ? 'text-purple-400' : 'text-[#535353]'}`}>
            {msg.status === 'FULFILLED' ? '✓ Song sent' : '● Waiting for a pick…'}
          </p>
        ) : (
          msg.status === 'OPEN'
            ? <button onClick={onPickSong} className="mt-2 flex items-center gap-1 text-purple-400 text-[10px] font-semibold hover:text-purple-300 transition-colors">
                Pick a song <ChevronRight size={10} />
              </button>
            : <p className="text-[#535353] text-[10px] mt-2">Song sent ✓</p>
        )}
        <p className="text-[#535353] text-[9px] mt-1.5 text-right">{formatTime(msg.sentAt)}</p>
      </div>
    </div>
  )
}

export default function GroupConversationView({ group, onBack }) {
  const navigate = useNavigate()
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [liking, setLiking]       = useState(null)

  // Compose: AI suggest
  const [suggesting, setSuggesting]   = useState(false)
  const [suggested, setSuggested]     = useState(null)
  const [suggestNote, setSuggestNote] = useState('')
  const [sending, setSending]         = useState(false)
  const [suggestError, setSuggestError] = useState('')

  // Library picker — two-level
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
  const [pendingGroupRequestId, setPendingGroupRequestId] = useState(null)
  const [tagPickerKey, setTagPickerKey]         = useState(null)
  const [taste, setTaste]                       = useState(null)

  // Reply picker
  const [showReplyPicker, setShowReplyPicker]       = useState(false)
  const [replyPickerLoading, setReplyPickerLoading] = useState(false)
  const [replyPickerPicks, setReplyPickerPicks]     = useState([])
  const [replyPickerRemaining, setReplyPickerRemaining] = useState([])
  const [replySearch, setReplySearch]               = useState('')
  const [replySearchResults, setReplySearchResults] = useState([])
  const [replySearchLoading, setReplySearchLoading] = useState(false)
  const [activeRequestText, setActiveRequestText]   = useState('')

  // Library Spotify search
  const [librarySearchResults, setLibrarySearchResults] = useState([])
  const [librarySearchLoading, setLibrarySearchLoading] = useState(false)

  const bottomRef      = useRef(null)
  const searchRef      = useRef(null)
  const replySearchRef = useRef(null)
  const replySearchTimer = useRef(null)
  const librarySearchTimer = useRef(null)

  function loadFeed() {
    return getGroupFeed(group.id)
      .then(({ data }) => setMessages([...(data ?? [])].reverse()))
      .catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    loadFeed().finally(() => setLoading(false))
  }, [group.id])

  // Live updates — reload feed when anyone in this group posts
  useEffect(() => {
    function handleSse(e) {
      const { type, groupId } = e.detail ?? {}
      if (type === 'new_group_activity' && groupId === group.id) {
        loadFeed()
      }
    }
    window.addEventListener('jam:sse', handleSse)
    return () => window.removeEventListener('jam:sse', handleSse)
  }, [group.id])

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, messages.length])


  // ── Library picker ──────────────────────────────────────────
  function handleLibrarySearchChange(q) {
    setLibrarySearch(q)
    setLibrarySearchResults([])
    if (!q.trim()) return
    clearTimeout(librarySearchTimer.current)
    librarySearchTimer.current = setTimeout(async () => {
      setLibrarySearchLoading(true)
      try {
        const { data } = await searchSongs(q)
        setLibrarySearchResults(data.tracks || [])
      } catch (_) {}
      setLibrarySearchLoading(false)
    }, 400)
  }

  async function openLibrary() {
    setShowRequest(false)
    setShowReplyPicker(false)
    setShowLibrary(true)
    setLibraryView('playlists')
    setLibrarySearch('')
    setLibrarySearchResults([])
    setActivePlaylist(null)
    setLibrarySongs([])
    if (playlists.length === 0) {
      setPlaylistsLoading(true)
      try { const { data } = await getPlaylists(); setPlaylists(data.playlists || []) } catch (_) {}
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
        const { data } = await getLikedSongs(); setLibrarySongs(data.songs || [])
      } else {
        const { data } = await getPlaylist(playlist.id)
        setLibrarySongs((data.playlist?.songs || []).map(ps => ps.song))
      }
    } catch (_) {}
    setLibraryLoading(false)
  }

  function backToPlaylists() {
    setLibraryView('playlists'); setLibrarySearch(''); setLibrarySearchResults([]); setActivePlaylist(null); setLibrarySongs([])
  }

  function selectSong(song) {
    setSuggested({ song }); setSuggestNote(''); setSuggestError('')
    setShowLibrary(false); setShowReplyPicker(false)
    setLibrarySearch(''); setLibrarySearchResults([]); setLibraryView('playlists')
    setReplySearch(''); setReplySearchResults([])
  }

  const filteredLibrary = libraryView === 'playlists' ? playlists : librarySongs

  // ── Reply picker ────────────────────────────────────────────
  async function handlePickSongForRequest(requestId, requestText) {
    setPendingGroupRequestId(requestId)
    setActiveRequestText(requestText || '')
    setShowReplyPicker(true)
    setShowLibrary(false)
    setShowRequest(false)
    setReplySearch(''); setReplySearchResults([])
    setReplyPickerPicks([]); setReplyPickerRemaining([])
    setReplyPickerLoading(true)
    try {
      const { data } = await rankForGroupRequest(requestId)
      setReplyPickerPicks(data.picks || [])
      setReplyPickerRemaining(data.remaining || [])
    } catch (_) {
      try { const { data } = await getLikedSongs(); setReplyPickerRemaining(data.songs || []) } catch (__) {}
    }
    setReplyPickerLoading(false)
  }

  function handleReplySearchChange(q) {
    setReplySearch(q)
    if (!q.trim()) { setReplySearchResults([]); return }
    clearTimeout(replySearchTimer.current)
    replySearchTimer.current = setTimeout(async () => {
      setReplySearchLoading(true)
      try { const { data } = await searchSongs(q); setReplySearchResults(data.tracks || []) } catch (_) {}
      setReplySearchLoading(false)
    }, 400)
  }

  // ── Request composer ────────────────────────────────────────
  async function openRequestComposer() {
    setShowRequest(true); setShowLibrary(false); setShowReplyPicker(false)
    setRequestStep('templates'); setSelectedTemplate(null); setRequestVars({}); setRequestError('')
    setTagPickerKey(null)
    if (!taste) {
      try { const { data } = await getTaste(); setTaste(data) } catch (_) {}
    }
  }

  function selectTemplate(tmpl) {
    const vars = {}
    Object.entries(tmpl.placeholders).forEach(([key]) => { vars[key] = ['any'] })
    setSelectedTemplate(tmpl.id); setRequestVars(vars); setRequestStep('customize')
  }

  async function handleSendRequest() {
    const renderedText = renderTemplate(selectedTemplate, requestVars)
    setSendingRequest(true); setRequestError('')
    try {
      await sendGroupRequest(group.id, { templateId: selectedTemplate, variables: requestVars, renderedText })
      await loadFeed()
      setShowRequest(false); setRequestStep('templates'); setSelectedTemplate(null); setRequestVars({})
    } catch (e) {
      setRequestError(e.response?.data?.error || 'Failed to send request.')
    } finally {
      setSendingRequest(false)
    }
  }

  // ── Like toggle ─────────────────────────────────────────────
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
    window.dispatchEvent(new CustomEvent('jam:like'))
  }

  // ── AI suggest ──────────────────────────────────────────────
  async function handleAiSuggest() {
    setSuggesting(true); setSuggestError(''); setSuggested(null)
    try {
      const { data } = await getGroupAiSuggestion(group.id)
      setSuggested(data)
    } catch (e) {
      setSuggestError(e.response?.data?.error || 'AI suggestion failed. Try again.')
    } finally {
      setSuggesting(false)
    }
  }

  // ── Send song ───────────────────────────────────────────────
  async function handleSend() {
    if (!suggested) return
    setSending(true)
    try {
      await sendGroupRec(group.id, {
        songId:         suggested.song.spotifyId,
        context:        suggestNote.trim() || undefined,
        groupRequestId: pendingGroupRequestId ?? undefined,
      })
      await loadFeed()
      setSuggested(null); setSuggestNote(''); setPendingGroupRequestId(null)
      window.dispatchEvent(new CustomEvent('jam:like'))
    } catch (e) {
      setSuggestError(e.response?.data?.error || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  // Build request text map for reply quotes
  const requestTextMap = {}
  messages.forEach(m => { if (m.type === 'request') requestTextMap[m.id] = m.renderedText })

  const replyPickerHasAiPicks = replyPickerPicks.length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0 bg-[#121212]">
        <button onClick={onBack} className="text-[#B3B3B3] hover:text-white transition-colors p-1 -ml-1">
          <ArrowLeft size={18} />
        </button>
        <button onClick={() => navigate(`/groups/${group.id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center flex-shrink-0">
            <Users size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">{group.name}</p>
            <p className="text-[#B3B3B3] text-xs">
              {group.memberCount ?? group._count?.members ?? 0} members · tap to view
            </p>
          </div>
          <ChevronRight size={14} className="text-[#535353] flex-shrink-0 ml-auto" />
        </button>
      </div>

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
              {group.name} · {messages.filter(m => m.type === 'recommendation').length} song{messages.filter(m => m.type === 'recommendation').length !== 1 ? 's' : ''}
            </p>
            {messages.map(msg =>
              msg.type === 'request'
                ? <GroupRequestBubble key={msg.id} msg={msg}
                    onPickSong={() => handlePickSongForRequest(msg.id, msg.renderedText)} />
                : <GroupMessage key={msg.id} msg={msg} onLikeToggle={handleLikeToggle}
                    requestText={msg.groupRequestId ? requestTextMap[msg.groupRequestId] : null} />
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Reply picker panel ── */}
      {showReplyPicker && (
        <div className="flex-shrink-0 border-t border-white/5 bg-[#181818] flex flex-col" style={{ maxHeight: '340px' }}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-purple-400 text-[9px] font-bold uppercase tracking-wider">Replying to</p>
              <p className="text-white/50 text-[10px] truncate italic">"{activeRequestText}"</p>
            </div>
            <button onClick={() => { setShowReplyPicker(false); setPendingGroupRequestId(null) }}
              className="text-[#535353] hover:text-white transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          <div className="px-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#282828] rounded-full px-3 py-1.5">
              <Search size={12} className="text-[#535353] flex-shrink-0" />
              <input ref={replySearchRef} value={replySearch}
                onChange={e => handleReplySearchChange(e.target.value)}
                placeholder="Search Spotify or browse below…"
                className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder-[#535353]" />
              {replySearch && (
                <button onClick={() => { setReplySearch(''); setReplySearchResults([]) }}
                  className="text-[#535353] hover:text-white"><X size={11} /></button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {replySearch.trim() ? (
              replySearchLoading
                ? <div className="flex items-center justify-center py-6"><div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
                : replySearchResults.length === 0
                  ? <p className="text-center text-[#535353] text-xs py-6">No results</p>
                  : replySearchResults.map(song => (
                      <button key={song.spotifyId} onClick={() => selectSong(song)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                          {song.albumArtUrl ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{song.title}</p>
                          <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                        </div>
                      </button>
                    ))
            ) : replyPickerLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[#535353] text-[10px]">Finding best matches…</p>
              </div>
            ) : (
              <>
                {replyPickerHasAiPicks && (
                  <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-purple-400">
                    ✨ AI picks for this request
                  </p>
                )}
                {replyPickerPicks.map(song => (
                  <button key={song.spotifyId} onClick={() => selectSong(song)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                      {song.albumArtUrl ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{song.title}</p>
                      <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                    </div>
                    {song.aiReason && <span className="text-[#535353] text-[9px] italic flex-shrink-0 max-w-[90px] text-right leading-tight">{song.aiReason}</span>}
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
                      {song.albumArtUrl ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{song.title}</p>
                      <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                    </div>
                  </button>
                ))}
                {replyPickerPicks.length === 0 && replyPickerRemaining.length === 0 && !replyPickerLoading && (
                  <p className="text-center text-[#535353] text-xs py-8">No songs in your library — search Spotify above</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Request composer panel ── */}
      {showRequest && (
        <div className="flex-shrink-0 border-t border-white/5 bg-[#181818] flex flex-col" style={{ maxHeight: '300px' }}>
          {requestStep === 'templates' ? (
            <>
              <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
                <span className="text-white text-xs font-semibold">Choose a template</span>
                <button onClick={() => setShowRequest(false)} className="text-[#535353] hover:text-white transition-colors"><X size={16} /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-2">
                {REQUEST_TEMPLATES.map(tmpl => {
                  const slotCount = Object.keys(tmpl.placeholders).length
                  return (
                    <button key={tmpl.id} onClick={() => selectTemplate(tmpl)}
                      className="w-full text-left bg-[#282828] hover:bg-[#333] rounded-xl p-3 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-purple-400 text-[9px] font-bold uppercase tracking-wider">{tmpl.label}</p>
                        <span className="text-[#535353] text-[9px]">{slotCount} tag{slotCount !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-white text-xs leading-relaxed">
                        {tmpl.template.split(/(\{[^}]+\})/).map((part, i) => {
                          const m = part.match(/^\{(\w+)\}$/)
                          if (!m) return <span key={i}>{part}</span>
                          return <span key={i} className="text-purple-400 font-semibold">{tmpl.placeholders[m[1]]?.label ?? m[1]}</span>
                        })}
                      </p>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-shrink-0">
                <button onClick={() => setRequestStep('templates')} className="text-[#B3B3B3] hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                <span className="text-white text-xs font-semibold flex-1">Tap a tag to customise</span>
                <button onClick={() => setShowRequest(false)} className="text-[#535353] hover:text-white transition-colors"><X size={16} /></button>
              </div>
              <div className="px-4 py-2 flex-1 overflow-y-auto">
                <div className="text-white text-sm leading-loose flex flex-wrap items-center gap-x-1 gap-y-2">
                  {renderTemplateWithPills(selectedTemplate, requestVars, setTagPickerKey)}
                </div>
                {requestError && <p className="text-red-400 text-[10px] mt-2">{requestError}</p>}
              </div>
              <div className="px-4 pb-4 pt-2 flex-shrink-0">
                <button onClick={handleSendRequest} disabled={sendingRequest}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-purple-500 transition-colors">
                  {sendingRequest ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tag picker overlay ── */}
      {tagPickerKey && selectedTemplate && (() => {
        const ph = REQUEST_TEMPLATES.find(t => t.id === selectedTemplate)?.placeholders[tagPickerKey]
        if (!ph) return null
        return (
          <TagPicker
            category={ph.category}
            label={ph.label}
            currentVals={requestVars[tagPickerKey] ?? ['any']}
            taste={taste}
            onDone={vals => { setRequestVars(prev => ({ ...prev, [tagPickerKey]: vals })); setTagPickerKey(null) }}
            onClose={() => setTagPickerKey(null)}
          />
        )
      })()}

      {/* ── Library picker panel ── */}
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
              <input ref={searchRef} value={librarySearch} onChange={e => handleLibrarySearchChange(e.target.value)}
                placeholder="Search Spotify…"
                className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder-[#535353]" />
              {librarySearch && (
                <button onClick={() => { setLibrarySearch(''); setLibrarySearchResults([]) }} className="text-[#535353] hover:text-white"><X size={11} /></button>
              )}
            </div>
            <button onClick={() => { setShowLibrary(false); setPendingGroupRequestId(null) }}
              className="text-[#535353] hover:text-white transition-colors flex-shrink-0"><X size={16} /></button>
          </div>

          {librarySearch.trim() ? (
            /* ── Spotify search results ── */
            <div className="overflow-y-auto flex-1">
              {librarySearchLoading
                ? <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
                : librarySearchResults.length === 0
                  ? <p className="text-center text-[#535353] text-xs py-8">No results</p>
                  : librarySearchResults.map(song => (
                      <button key={song.spotifyId} onClick={() => selectSong(song)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                          {song.albumArtUrl ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{song.title}</p>
                          <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                        </div>
                      </button>
                    ))
              }
            </div>
          ) : libraryView === 'playlists' ? (
            /* ── Playlist browser ── */
            <div className="overflow-y-auto flex-1">
              {playlistsLoading
                ? <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
                : (
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
                    {filteredLibrary.map(pl => (
                      <button key={pl.id} onClick={() => selectPlaylist({ ...pl, type: 'playlist' })}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                          {pl.coverUrl ? <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><ListMusic size={14} className="text-[#535353]" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{pl.name}</p>
                          <p className="text-[#B3B3B3] text-[10px] mt-0.5">{pl._count?.songs ?? 0} songs</p>
                        </div>
                        <ChevronRight size={14} className="text-[#535353] flex-shrink-0" />
                      </button>
                    ))}
                    {playlists.length === 0 && !playlistsLoading && (
                      <p className="text-center text-[#535353] text-[10px] px-4 pb-4 pt-1">No imported playlists yet</p>
                    )}
                  </>
                )}
            </div>
          ) : (
            /* ── Songs inside a playlist ── */
            <div className="overflow-y-auto flex-1">
              {libraryLoading
                ? <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
                : filteredLibrary.length === 0
                  ? <p className="text-center text-[#535353] text-xs py-8">This playlist is empty</p>
                  : filteredLibrary.map(song => (
                      <button key={song.spotifyId} onClick={() => selectSong(song)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-9 h-9 flex-shrink-0 rounded-md overflow-hidden bg-[#282828]">
                          {song.albumArtUrl ? <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Music size={12} className="text-[#535353]" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{song.title}</p>
                          <p className="text-[#B3B3B3] text-[10px] truncate mt-0.5">{song.artist}</p>
                        </div>
                      </button>
                    ))
              }
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
                  : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-[#B3B3B3]" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{suggested.song.title}</p>
                <p className="text-[#B3B3B3] text-[10px] truncate">{suggested.song.artist}</p>
              </div>
              {suggested.aiQuery && (
                <span className="text-purple-400 text-[9px] font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                  <Sparkles size={9} /> AI pick
                </span>
              )}
              {pendingGroupRequestId && (
                <span className="text-[#535353] text-[9px] flex-shrink-0 flex items-center gap-0.5">
                  <Reply size={8} /> reply
                </span>
              )}
              <button onClick={() => { setSuggested(null); setSuggestNote(''); setSuggestError(''); setPendingGroupRequestId(null) }}
                className="text-[#535353] hover:text-white transition-colors ml-1"><X size={14} /></button>
            </div>
            <div className="flex items-center gap-2">
              <input value={suggestNote} onChange={e => setSuggestNote(e.target.value.slice(0, 200))}
                placeholder={`Add a note for ${group.name}… (optional)`}
                className="flex-1 bg-[#282828] text-white text-xs rounded-full px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-[#535353]" />
              <button onClick={handleSend} disabled={sending}
                className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-purple-500 transition-colors">
                <Send size={13} className="text-white" />
              </button>
            </div>
            {suggestError && <p className="text-red-400 text-[10px]">{suggestError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={openRequestComposer}
              className={`text-xs font-semibold flex-shrink-0 px-3 py-1.5 rounded-full border transition-colors ${
                showRequest
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
              }`}>
              Request a Song
            </button>
            <div className="flex-1" />
            <button onClick={openLibrary} title="Pick from your library"
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                showLibrary ? 'bg-purple-600 text-white' : 'bg-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#3e3e3e]'
              }`}>
              <Plus size={15} />
            </button>
            <button onClick={handleAiSuggest} disabled={suggesting}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 flex-shrink-0">
              <Sparkles size={12} className={suggesting ? 'animate-pulse' : ''} />
              {suggesting ? 'Finding…' : 'AI Suggest'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

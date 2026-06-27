import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Check, Music, UserPlus, Users, Sparkles, RefreshCw, ArrowRight } from 'lucide-react'
import { getFriends } from '../../phase3/api/friends'
import { sendRecommendation } from '../../phase3/api/recommendations'
import { getGroups, sendGroupRec } from '../api/groups'
import { getAiSuggestion } from '../../phase7/api/ai'

// ── AI Suggestion Widget ──────────────────────────────────────────────────────

function AiSuggestWidget({ friend, onAccept }) {
  const [status, setStatus]   = useState('idle')  // idle | loading | done | error
  const [suggestion, setSugg] = useState(null)
  const [errMsg, setErrMsg]   = useState('')

  async function suggest() {
    setStatus('loading')
    setErrMsg('')
    try {
      const { data } = await getAiSuggestion(friend.id)
      setSugg(data)
      setStatus('done')
    } catch (e) {
      setErrMsg(e.response?.data?.error || 'AI suggestion failed')
      setStatus('error')
    }
  }

  if (status === 'idle') {
    return (
      <button
        onClick={suggest}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-[#1DB954]/40 text-[#1DB954] text-sm font-semibold hover:bg-[#1DB954]/10 transition-colors"
      >
        <Sparkles size={15} />
        Recommend with AI
      </button>
    )
  }

  if (status === 'loading') {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a1a1a] text-[#B3B3B3] text-sm">
        <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
        Asking AI for a suggestion…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl bg-[#1a1a1a] p-3 text-center">
        <p className="text-red-400 text-sm mb-2">{errMsg}</p>
        <button onClick={suggest} className="text-[#1DB954] text-xs hover:underline">Try again</button>
      </div>
    )
  }

  // done
  const song = suggestion?.song
  return (
    <div className="rounded-xl bg-[#1a1a1a] p-3">
      <p className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
        <Sparkles size={10} className="text-[#1DB954]" /> AI suggestion
      </p>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-[#282828]">
          {song?.albumArtUrl
            ? <img src={song.albumArtUrl} alt={song.album} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-[#B3B3B3]" /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{song?.title}</p>
          <p className="text-[#B3B3B3] text-xs truncate">{song?.artist}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(song)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1DB954] text-black text-sm font-bold py-1.5 rounded-full hover:bg-[#1ed760] transition-colors"
        >
          <ArrowRight size={14} /> Use this song
        </button>
        <button
          onClick={suggest}
          title="Try again"
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[#282828] text-[#B3B3B3] hover:text-white transition-colors"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Friends Tab ───────────────────────────────────────────────────────────────

function FriendsTab({ activeSong, onSongChange, onClose }) {
  const [friends, setFriends]   = useState([])
  const [selected, setSelected] = useState(null)
  const [context, setContext]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    getFriends()
      .then(({ data }) => setFriends(data))
      .catch(() => setError('Could not load friends'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSend() {
    if (!selected || !activeSong) return
    setSending(true)
    setError('')
    try {
      await sendRecommendation({
        songId: activeSong.spotifyId,
        recipientId: selected.id,
        context: context.trim() || undefined,
      })
      setSent(true)
      setTimeout(onClose, 2500)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-3">
          <Check size={32} className="text-[#1DB954]" />
        </div>
        <p className="text-white font-bold text-lg">Sent!</p>
        <p className="text-[#B3B3B3] text-sm mt-1">{selected?.displayName} got your recommendation</p>
      </div>
    )
  }

  if (loading) return <p className="text-[#B3B3B3] text-sm text-center py-6">Loading friends…</p>

  if (friends.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
          <UserPlus size={24} className="text-[#B3B3B3]" />
        </div>
        <p className="text-white font-semibold mb-1">No friends yet</p>
        <p className="text-[#B3B3B3] text-sm mb-4">Add friends to start sharing songs with them.</p>
        <Link
          to="/friends"
          onClick={onClose}
          className="inline-block bg-white text-black font-bold px-5 py-2 rounded-full text-sm hover:scale-105 transition-transform"
        >
          Find Friends
        </Link>
      </div>
    )
  }

  return (
    <>
      <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">Share with</p>

      <div className="space-y-1 max-h-36 overflow-y-auto mb-4 pr-1">
        {friends.map(f => (
          <button
            key={f.id}
            onClick={() => setSelected(f)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
              selected?.id === f.id ? 'bg-[#1DB954]/15 ring-1 ring-[#1DB954]/40' : 'hover:bg-[#3e3e3e]'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#535353] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {f.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{f.displayName}</p>
              <p className="text-[#B3B3B3] text-xs truncate">@{f.username}</p>
            </div>
            {selected?.id === f.id && <Check size={15} className="text-[#1DB954] flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* AI suggestion — shown when a friend is selected */}
      {selected && (
        <div className="mb-4">
          <AiSuggestWidget friend={selected} onAccept={onSongChange} />
        </div>
      )}

      {selected && (
        <div className="mb-4">
          <textarea
            value={context}
            onChange={e => setContext(e.target.value.slice(0, 200))}
            placeholder={`Tell ${selected.displayName} why you're sharing this… (optional)`}
            rows={2}
            className="w-full bg-[#3e3e3e] text-white text-sm rounded-xl p-3 resize-none placeholder-[#6a6a6a] focus:outline-none focus:ring-1 focus:ring-[#1DB954]/50"
          />
          <p className="text-[#6a6a6a] text-[10px] text-right mt-1">{context.length} / 200</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSend}
        disabled={!selected || !activeSong || sending}
        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sending ? 'Sending…' : 'Send Recommendation'}
      </button>
    </>
  )
}

// ── Groups Tab ────────────────────────────────────────────────────────────────

function GroupsTab({ activeSong, onClose }) {
  const [groups, setGroups]     = useState([])
  const [selected, setSelected] = useState(null)
  const [context, setContext]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    getGroups()
      .then(({ data }) => setGroups(data))
      .catch(() => setError('Could not load groups'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSend() {
    if (!selected || !activeSong) return
    setSending(true)
    setError('')
    try {
      await sendGroupRec(selected.id, {
        songId: activeSong.spotifyId,
        context: context.trim() || undefined,
      })
      setSent(true)
      setTimeout(onClose, 2500)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
          <Check size={32} className="text-purple-400" />
        </div>
        <p className="text-white font-bold text-lg">Sent to group!</p>
        <p className="text-[#B3B3B3] text-sm mt-1">{selected?.name} got your recommendation</p>
      </div>
    )
  }

  if (loading) return <p className="text-[#B3B3B3] text-sm text-center py-6">Loading groups…</p>

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
          <Users size={24} className="text-[#B3B3B3]" />
        </div>
        <p className="text-white font-semibold mb-1">No groups yet</p>
        <p className="text-[#B3B3B3] text-sm mb-4">Create a group to share songs with multiple friends.</p>
        <Link
          to="/groups"
          onClick={onClose}
          className="inline-block bg-white text-black font-bold px-5 py-2 rounded-full text-sm hover:scale-105 transition-transform"
        >
          Create a Group
        </Link>
      </div>
    )
  }

  return (
    <>
      <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">Share with group</p>

      <div className="space-y-1 max-h-44 overflow-y-auto mb-4 pr-1">
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => setSelected(g)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
              selected?.id === g.id ? 'bg-purple-500/15 ring-1 ring-purple-500/40' : 'hover:bg-[#3e3e3e]'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center text-white flex-shrink-0">
              <Users size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{g.name}</p>
              <p className="text-[#B3B3B3] text-xs">{g.memberCount} member{g.memberCount !== 1 ? 's' : ''}</p>
            </div>
            {selected?.id === g.id && <Check size={15} className="text-purple-400 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mb-4">
          <textarea
            value={context}
            onChange={e => setContext(e.target.value.slice(0, 200))}
            placeholder={`Why share this with ${selected.name}… (optional)`}
            rows={3}
            className="w-full bg-[#3e3e3e] text-white text-sm rounded-xl p-3 resize-none placeholder-[#6a6a6a] focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
          <p className="text-[#6a6a6a] text-[10px] text-right mt-1">{context.length} / 200</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSend}
        disabled={!selected || !activeSong || sending}
        className="w-full bg-purple-600 text-white font-bold py-3 rounded-full hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sending ? 'Sending…' : 'Send to Group'}
      </button>
    </>
  )
}

// ── Main SharePanel ───────────────────────────────────────────────────────────

export default function SharePanel({ song, onClose }) {
  const [tab, setTab]               = useState('friends')
  const [activeSong, setActiveSong] = useState(song)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#282828] rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-xl">Share song</h2>
          <button onClick={onClose} className="text-[#B3B3B3] hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Active song card */}
        <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 mb-4">
          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#3e3e3e]">
            {activeSong?.albumArtUrl
              ? <img src={activeSong.albumArtUrl} alt={activeSong.album} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-[#B3B3B3]" /></div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{activeSong?.title ?? 'No song selected'}</p>
            <p className="text-[#B3B3B3] text-xs truncate">{activeSong?.artist ?? 'Pick a song or use AI'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[#1a1a1a] rounded-full p-1">
          {[
            { id: 'friends', label: 'Friends', icon: <UserPlus size={13} /> },
            { id: 'groups',  label: 'Group',   icon: <Users    size={13} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-white text-black' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'friends'
          ? <FriendsTab activeSong={activeSong} onSongChange={setActiveSong} onClose={onClose} />
          : <GroupsTab  activeSong={activeSong} onClose={onClose} />
        }
      </div>
    </div>
  )
}

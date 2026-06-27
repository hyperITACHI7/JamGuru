import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Check, Music, UserPlus, Sparkles } from 'lucide-react'
import { getFriends } from '../api/friends'
import { sendRecommendation } from '../api/recommendations'
import api from '../../api/axios'

function getSongFriendMatches(spotifyId) {
  return api.get(`/songs/${spotifyId}/friend-matches`)
}

export default function SharePanel({ song, onClose }) {
  const [friends, setFriends]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Normal mode: single selected friend id
  // AI mode: Set of selected friend ids
  const [aiMode, setAiMode]         = useState(false)
  const [aiLoading, setAiLoading]   = useState(false)
  const [selected, setSelected]     = useState(null)       // string | null (normal)
  const [aiSelected, setAiSelected] = useState(new Set())  // Set<id> (ai mode)

  const [context, setContext]       = useState('')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [sentCount, setSentCount]   = useState(0)

  useEffect(() => {
    getFriends()
      .then(({ data }) => setFriends(data))
      .catch(() => setError('Could not load friends'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAiPredict() {
    setAiLoading(true)
    setError('')
    try {
      const { data } = await getSongFriendMatches(song.spotifyId)
      const ranked = data.friends
      setFriends(ranked)
      const autoSelected = new Set(
        ranked.filter(f => f.matchScore >= 50).map(f => f.id)
      )
      setAiSelected(autoSelected)
      setAiMode(true)
    } catch {
      setError('Could not load predictions. Try again.')
    } finally {
      setAiLoading(false)
    }
  }

  function toggleAiSelect(id) {
    setAiSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (aiMode) {
      if (aiSelected.size === 0) return
      setSending(true)
      setError('')
      try {
        await Promise.all(
          [...aiSelected].map(id =>
            sendRecommendation({
              songId:      song.spotifyId,
              recipientId: id,
              context:     context.trim() || undefined,
            })
          )
        )
        setSentCount(aiSelected.size)
        setSent(true)
        setTimeout(onClose, 2500)
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to send')
      } finally {
        setSending(false)
      }
    } else {
      if (!selected) return
      setSending(true)
      setError('')
      try {
        await sendRecommendation({
          songId:      song.spotifyId,
          recipientId: selected,
          context:     context.trim() || undefined,
        })
        setSent(true)
        setTimeout(onClose, 2500)
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to send')
      } finally {
        setSending(false)
      }
    }
  }

  const selectedFriend = !aiMode ? friends.find(f => f.id === selected) : null
  const highMatches    = friends.filter(f => (f.matchScore ?? 0) >= 50)
  const lowMatches     = friends.filter(f => (f.matchScore ?? 0) < 50)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#282828] rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-xl">
            {aiMode ? 'Who might love this' : 'Share song'}
          </h2>
          <button onClick={onClose} className="text-[#B3B3B3] hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Song card */}
        <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 mb-4">
          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#3e3e3e]">
            {song.albumArtUrl
              ? <img src={song.albumArtUrl} alt={song.album} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-[#B3B3B3]" /></div>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{song.title}</p>
            <p className="text-[#B3B3B3] text-xs truncate">{song.artist}</p>
          </div>
          {/* AI predict button — only in normal mode */}
          {!aiMode && !sent && !loading && friends.length > 0 && (
            <button
              onClick={handleAiPredict}
              disabled={aiLoading}
              className="flex items-center gap-1 text-[#1DB954] hover:text-[#1ed760] text-[11px] font-bold transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Sparkles size={12} className={aiLoading ? 'animate-pulse' : ''} />
              {aiLoading ? 'Predicting…' : 'AI Predict'}
            </button>
          )}
          {/* Exit AI mode */}
          {aiMode && !sent && (
            <button
              onClick={() => { setAiMode(false); setAiSelected(new Set()) }}
              className="text-[#535353] hover:text-white text-[11px] transition-colors flex-shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        {/* Sent confirmation */}
        {sent && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-[#1DB954]" />
            </div>
            <p className="text-white font-bold text-lg">Sent!</p>
            <p className="text-[#B3B3B3] text-sm mt-1">
              {aiMode
                ? `Shared with ${sentCount} friend${sentCount !== 1 ? 's' : ''}`
                : `${selectedFriend?.displayName ?? 'Your friend'} got your recommendation`}
            </p>
          </div>
        )}

        {!sent && (
          <>
            {loading && (
              <p className="text-[#B3B3B3] text-sm text-center py-6">Loading friends…</p>
            )}

            {!loading && friends.length === 0 && (
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
            )}

            {!loading && friends.length > 0 && (
              <>
                {/* ── NORMAL MODE ── */}
                {!aiMode && (
                  <>
                    <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">Share with</p>
                    <div className="space-y-1 max-h-44 overflow-y-auto mb-4 pr-1">
                      {friends.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSelected(f.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                            selected === f.id
                              ? 'bg-[#1DB954]/15 ring-1 ring-[#1DB954]/40'
                              : 'hover:bg-[#3e3e3e]'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-[#535353] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {f.displayName?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{f.displayName}</p>
                            <p className="text-[#B3B3B3] text-xs truncate">@{f.username}</p>
                          </div>
                          {selected === f.id && <Check size={15} className="text-[#1DB954] flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* ── AI MODE ── */}
                {aiMode && (
                  <div className="max-h-52 overflow-y-auto mb-4 pr-1 space-y-3">
                    {highMatches.length > 0 && (
                      <div>
                        <p className="text-[#1DB954] text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Sparkles size={9} /> Likely to love it
                        </p>
                        <div className="space-y-1">
                          {highMatches.map(f => (
                            <button
                              key={f.id}
                              onClick={() => toggleAiSelect(f.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                                aiSelected.has(f.id)
                                  ? 'bg-[#1DB954]/15 ring-1 ring-[#1DB954]/40'
                                  : 'hover:bg-[#3e3e3e] opacity-60'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-[#535353] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {f.displayName?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{f.displayName}</p>
                                <p className="text-[#B3B3B3] text-xs truncate">
                                  {f.hasLiked ? 'Already liked this song' : `@${f.username}`}
                                </p>
                              </div>
                              <span className="text-[#1DB954] text-[10px] font-bold flex-shrink-0">
                                {f.hasLiked ? '❤' : `${f.matchScore}%`}
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-1 transition-colors ${
                                aiSelected.has(f.id)
                                  ? 'bg-[#1DB954] border-[#1DB954]'
                                  : 'border-[#535353]'
                              }`}>
                                {aiSelected.has(f.id) && <Check size={9} className="text-black" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {lowMatches.length > 0 && (
                      <div>
                        <p className="text-[#535353] text-[10px] font-bold uppercase tracking-widest mb-1.5">Other friends</p>
                        <div className="space-y-1">
                          {lowMatches.map(f => (
                            <button
                              key={f.id}
                              onClick={() => toggleAiSelect(f.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                                aiSelected.has(f.id)
                                  ? 'bg-[#1DB954]/15 ring-1 ring-[#1DB954]/40'
                                  : 'hover:bg-[#3e3e3e]'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-[#535353] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {f.displayName?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{f.displayName}</p>
                                <p className="text-[#B3B3B3] text-xs truncate">@{f.username}</p>
                              </div>
                              {f.matchScore > 0 && (
                                <span className="text-[#535353] text-[10px] font-bold flex-shrink-0">{f.matchScore}%</span>
                              )}
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-1 transition-colors ${
                                aiSelected.has(f.id)
                                  ? 'bg-[#1DB954] border-[#1DB954]'
                                  : 'border-[#535353]'
                              }`}>
                                {aiSelected.has(f.id) && <Check size={9} className="text-black" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Context note — shown when a friend is selected in either mode */}
                {((!aiMode && selected) || (aiMode && aiSelected.size > 0)) && (
                  <div className="mb-4">
                    <textarea
                      value={context}
                      onChange={e => setContext(e.target.value.slice(0, 200))}
                      placeholder={
                        aiMode
                          ? 'Add a note for everyone… (optional)'
                          : `Tell ${selectedFriend?.displayName ?? 'them'} why you're sharing this… (optional)`
                      }
                      rows={2}
                      className="w-full bg-[#3e3e3e] text-white text-sm rounded-xl p-3 resize-none placeholder-[#6a6a6a] focus:outline-none focus:ring-1 focus:ring-[#1DB954]/50"
                    />
                    <p className="text-[#6a6a6a] text-[10px] text-right mt-1">{context.length} / 200</p>
                  </div>
                )}

                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                <button
                  onClick={handleSend}
                  disabled={aiMode ? aiSelected.size === 0 || sending : !selected || sending}
                  className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending
                    ? 'Sending…'
                    : aiMode
                      ? `Send to ${aiSelected.size} friend${aiSelected.size !== 1 ? 's' : ''}`
                      : 'Send Recommendation'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Check, Music, UserPlus } from 'lucide-react'
import { getFriends } from '../api/friends'
import { sendRecommendation } from '../api/recommendations'

export default function SharePanel({ song, onClose }) {
  const [friends, setFriends]     = useState([])
  const [selected, setSelected]   = useState(null)
  const [context, setContext]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    getFriends()
      .then(({ data }) => setFriends(data))
      .catch(() => setError('Could not load friends'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSend() {
    if (!selected) return
    setSending(true)
    setError('')
    try {
      await sendRecommendation({
        songId: song.spotifyId,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#282828] rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-xl">Share song</h2>
          <button onClick={onClose} className="text-[#B3B3B3] hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Song card */}
        <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 mb-5">
          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#3e3e3e]">
            {song.albumArtUrl
              ? <img src={song.albumArtUrl} alt={song.album} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-[#B3B3B3]" /></div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{song.title}</p>
            <p className="text-[#B3B3B3] text-xs truncate">{song.artist}</p>
          </div>
        </div>

        {/* Sent confirmation */}
        {sent && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-[#1DB954]" />
            </div>
            <p className="text-white font-bold text-lg">Sent!</p>
            <p className="text-[#B3B3B3] text-sm mt-1">{selected?.displayName} got your recommendation</p>
          </div>
        )}

        {!sent && (
          <>
            {/* Loading */}
            {loading && (
              <p className="text-[#B3B3B3] text-sm text-center py-6">Loading friends…</p>
            )}

            {/* No friends */}
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

            {/* Friends list */}
            {!loading && friends.length > 0 && (
              <>
                <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">
                  Share with
                </p>

                <div className="space-y-1 max-h-44 overflow-y-auto mb-4 pr-1">
                  {friends.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelected(f)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                        selected?.id === f.id
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
                      {selected?.id === f.id && (
                        <Check size={15} className="text-[#1DB954] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Context textarea — visible only after friend selected */}
                {selected && (
                  <div className="mb-4">
                    <textarea
                      value={context}
                      onChange={e => setContext(e.target.value.slice(0, 200))}
                      placeholder={`Tell ${selected.displayName} why you're sharing this… (optional)`}
                      rows={3}
                      className="w-full bg-[#3e3e3e] text-white text-sm rounded-xl p-3 resize-none placeholder-[#6a6a6a] focus:outline-none focus:ring-1 focus:ring-[#1DB954]/50"
                    />
                    <p className="text-[#6a6a6a] text-[10px] text-right mt-1">{context.length} / 200</p>
                  </div>
                )}

                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                <button
                  onClick={handleSend}
                  disabled={!selected || sending}
                  className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending…' : 'Send Recommendation'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

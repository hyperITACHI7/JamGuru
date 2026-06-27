import { useState } from 'react'
import { X, Check, Loader, Music } from 'lucide-react'
import { importPlaylist } from '../api/auth'

export default function ImportPlaylistModal({ onClose, onImported }) {
  const [url, setUrl]         = useState('')
  const [status, setStatus]   = useState('idle')  // idle | loading | success | error
  const [result, setResult]   = useState(null)
  const [errMsg, setErrMsg]   = useState('')

  async function handleImport() {
    const trimmed = url.trim()
    if (!trimmed) return
    setStatus('loading')
    setErrMsg('')
    try {
      const { data } = await importPlaylist(trimmed)
      setResult(data)
      setStatus('success')
      onImported?.()
    } catch (e) {
      setErrMsg(e.response?.data?.error || 'Could not import playlist. Check the URL and try again.')
      setStatus('error')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleImport()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative z-10 w-full md:w-[420px] bg-[#181818] rounded-t-2xl md:rounded-2xl shadow-2xl p-6">
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">Import Spotify Playlist</h2>
            <p className="text-[#B3B3B3] text-xs mt-0.5">Paste any public playlist link</p>
          </div>
          <button onClick={onClose} className="text-[#B3B3B3] hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Success state */}
        {status === 'success' && result && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-[#1DB954]" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Imported!</p>
            <p className="text-[#B3B3B3] text-sm">
              {result.added} new song{result.added !== 1 ? 's' : ''} added
              {result.imported !== result.added ? ` (${result.imported} total in playlist)` : ''}
            </p>
            <p className="text-[#535353] text-xs mt-2">
              Your recommendation algorithm has been updated
            </p>
            <button
              onClick={onClose}
              className="mt-5 bg-[#1DB954] text-black font-bold px-8 py-2.5 rounded-full hover:bg-[#1ed760] transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Input state */}
        {status !== 'success' && (
          <>
            {/* How to get link hint */}
            <div className="bg-[#282828] rounded-xl p-3 mb-4 flex items-start gap-2.5">
              <Music size={15} className="text-[#1DB954] flex-shrink-0 mt-0.5" />
              <p className="text-[#B3B3B3] text-xs leading-relaxed">
                Open any playlist on Spotify → share → copy link. Works with your own playlists and any public playlist.
              </p>
            </div>

            {/* URL input */}
            <div className="flex items-center gap-2 bg-[#282828] rounded-xl px-4 py-3 mb-4 ring-1 ring-transparent focus-within:ring-[#1DB954]/40 transition-all">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://open.spotify.com/playlist/…"
                className="flex-1 bg-transparent text-white text-sm placeholder-[#535353] focus:outline-none"
                disabled={status === 'loading'}
                autoFocus
              />
              {url && status !== 'loading' && (
                <button onClick={() => setUrl('')} className="text-[#535353] hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {errMsg && (
              <p className="text-red-400 text-sm mb-4">{errMsg}</p>
            )}

            <button
              onClick={handleImport}
              disabled={!url.trim() || status === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Importing…
                </>
              ) : (
                'Import Playlist'
              )}
            </button>
            {status === 'loading' && (
              <p className="text-[#535353] text-xs text-center mt-2">
                This may take a moment for large playlists
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

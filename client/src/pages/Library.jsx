import { useState } from 'react'
import { Heart, Music, Plus, X, Check, Loader } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'
import api from '../api/axios'

function importPlaylist(playlistUrl) {
  return api.post('/auth/spotify/import-playlist', { playlistUrl })
}

function ImportModal({ onClose }) {
  const [url, setUrl]       = useState('')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [err, setErr]       = useState('')

  async function handleImport() {
    const trimmed = url.trim()
    if (!trimmed) return
    setStatus('loading')
    setErr('')
    try {
      const { data } = await importPlaylist(trimmed)
      setResult(data)
      setStatus('success')
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not import. Check the URL and try again.')
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full md:w-[420px] bg-[#181818] rounded-t-2xl md:rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">Import Spotify Playlist</h2>
            <p className="text-[#B3B3B3] text-xs mt-0.5">Paste any public playlist link</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#B3B3B3] hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {status === 'success' && result ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-[#1DB954]" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Imported!</p>
            <p className="text-[#B3B3B3] text-sm">
              {result.added} new song{result.added !== 1 ? 's' : ''} added to your library
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 bg-[#1DB954] text-black font-bold px-8 py-2.5 rounded-full"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="bg-[#282828] rounded-xl p-3 mb-4 flex items-start gap-2.5">
              <Music size={15} className="text-[#1DB954] flex-shrink-0 mt-0.5" />
              <p className="text-[#B3B3B3] text-xs leading-relaxed">
                On Spotify: open a playlist → Share → Copy link. Works with any public playlist.
              </p>
            </div>

            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleImport() }}
              placeholder="https://open.spotify.com/playlist/…"
              className="w-full bg-[#282828] text-white text-sm px-4 py-3 rounded-xl mb-4 focus:outline-none focus:ring-1 focus:ring-[#1DB954]/50 placeholder-[#535353]"
              disabled={status === 'loading'}
            />

            {err && <p className="text-red-400 text-sm mb-4">{err}</p>}

            <button
              type="button"
              onClick={handleImport}
              disabled={!url.trim() || status === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-[#1DB954] text-black font-bold py-3 rounded-full disabled:opacity-40"
            >
              {status === 'loading' ? (
                <><Loader size={16} className="animate-spin" /> Importing…</>
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

export default function Library() {
  const [showImport, setShowImport] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar showNav={false} />

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h1 className="text-white font-bold text-2xl mt-2 mb-6">Your Library</h1>

        <section className="mb-8">
          <Link
            to="/liked-songs"
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#ffffff0d] transition-colors"
          >
            <div className="w-16 h-16 flex-shrink-0 rounded-md bg-gradient-to-br from-indigo-500 to-violet-800 flex items-center justify-center shadow-lg">
              <Heart size={28} className="fill-white text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-base truncate">Liked Songs</p>
              <p className="text-[#B3B3B3] text-sm mt-0.5">Playlist</p>
            </div>
          </Link>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Playlists</h2>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="w-8 h-8 rounded-full bg-[#282828] hover:bg-[#3e3e3e] flex items-center justify-center transition-colors"
              title="Import Spotify playlist"
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#282828] flex items-center justify-center mb-4">
              <Music size={28} className="text-[#B3B3B3]" />
            </div>
            <p className="text-white font-semibold mb-1">Import a Spotify playlist</p>
            <p className="text-[#B3B3B3] text-sm max-w-xs mb-4">
              Paste a playlist link to add songs to your library and boost your recommendations.
            </p>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-[#1DB954] text-black font-bold px-5 py-2 rounded-full text-sm hover:bg-[#1ed760] transition-colors"
            >
              <Plus size={15} /> Import Playlist
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, Check, Loader } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import api from '../api/axios'

export default function ImportPlaylist() {
  const [url, setUrl]       = useState('')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [err, setErr]       = useState('')
  const navigate = useNavigate()

  async function handleImport() {
    const trimmed = url.trim()
    if (!trimmed) return
    setStatus('loading')
    setErr('')
    try {
      const { data } = await api.post('/auth/spotify/import-playlist', { playlistUrl: trimmed })
      setResult(data)
      setStatus('success')
      // Navigate to the new playlist after a short delay
      if (data.playlistId) {
        setTimeout(() => navigate(`/playlists/${data.playlistId}`), 1500)
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not import. Check the URL and try again.')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h1 className="text-white font-bold text-2xl mt-2 mb-2">Import Playlist</h1>
        <p className="text-[#B3B3B3] text-sm mb-6">
          Paste any public Spotify playlist link to add all its songs to your library.
        </p>

        {status === 'success' && result ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#1DB954]/20 flex items-center justify-center mb-4">
              <Check size={40} className="text-[#1DB954]" />
            </div>
            <p className="text-white font-bold text-xl mb-2">Done!</p>
            {result.imported === 0 ? (
              <p className="text-[#B3B3B3] text-sm">
                No songs found — the playlist may be empty or contain only local files.
              </p>
            ) : (
              <>
                <p className="text-[#B3B3B3] text-sm mb-1">
                  {result.imported} song{result.imported !== 1 ? 's' : ''} found in playlist
                </p>
                <p className="text-[#1DB954] text-sm font-semibold">
                  {result.added > 0
                    ? `${result.added} new song${result.added !== 1 ? 's' : ''} added to your library`
                    : 'All songs already in your library'}
                </p>
              </>
            )}
            <p className="text-[#535353] text-xs mt-3">Your recommendations have been updated</p>
            <button
              type="button"
              onClick={() => { setUrl(''); setStatus('idle'); setResult(null) }}
              className="mt-6 border border-[#535353] text-white text-sm font-semibold px-6 py-2 rounded-full hover:border-white transition-colors"
            >
              Import another
            </button>
          </div>
        ) : (
          <>
            <div className="bg-[#282828] rounded-xl p-4 mb-5 flex items-start gap-3">
              <Music size={18} className="text-[#1DB954] flex-shrink-0 mt-0.5" />
              <p className="text-[#B3B3B3] text-sm leading-relaxed">
                On Spotify: open any playlist → tap the three dots → Share → Copy link.
                Works with your own playlists and any public playlist.
              </p>
            </div>

            <label className="text-[#B3B3B3] text-xs font-bold uppercase tracking-widest mb-2 block">
              Playlist URL
            </label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleImport() }}
              placeholder="https://open.spotify.com/playlist/…"
              className="w-full bg-[#282828] text-white px-4 py-3 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/50 placeholder-[#535353] text-sm"
              disabled={status === 'loading'}
              autoComplete="off"
            />

            {err && <p className="text-red-400 text-sm mb-4">{err}</p>}

            <button
              type="button"
              onClick={handleImport}
              disabled={!url.trim() || status === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-[#1DB954] text-black font-bold py-3.5 rounded-full mt-4 disabled:opacity-40"
            >
              {status === 'loading' ? (
                <><Loader size={18} className="animate-spin" /> Importing…</>
              ) : (
                'Import Playlist'
              )}
            </button>

            {status === 'loading' && (
              <p className="text-[#535353] text-xs text-center mt-3">
                Searching iTunes for each track — may take a moment for large playlists
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

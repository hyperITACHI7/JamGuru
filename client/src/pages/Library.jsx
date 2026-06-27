import { useState } from 'react'
import { Heart, Music, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'
import ImportPlaylistModal from '../components/ImportPlaylistModal'

export default function Library() {
  const [showImport, setShowImport] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar showNav={false} />

      {showImport && (
        <ImportPlaylistModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h1 className="text-white font-bold text-2xl mt-2 mb-6">Your Library</h1>

        {/* Liked Songs folder */}
        <section className="mb-8">
          <Link
            to="/liked-songs"
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#ffffff0d] transition-colors group"
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

        {/* Playlists */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Playlists</h2>
            <button
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

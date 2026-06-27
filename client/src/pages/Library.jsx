import { Heart, Music, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'

export default function Library() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar showNav={false} />

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h1 className="text-white font-bold text-2xl mt-2 mb-6">Your Library</h1>

        {/* Liked Songs */}
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

        {/* Playlists */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Playlists</h2>
            <Link
              to="/import-playlist"
              className="w-8 h-8 rounded-full bg-[#282828] hover:bg-[#3e3e3e] flex items-center justify-center transition-colors"
              title="Import Spotify playlist"
            >
              <Plus size={18} className="text-white" />
            </Link>
          </div>

          {/* Import playlist card — same style as Liked Songs */}
          <Link
            to="/import-playlist"
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#ffffff0d] transition-colors"
          >
            <div className="w-16 h-16 flex-shrink-0 rounded-md bg-[#282828] flex items-center justify-center shadow-lg">
              <Music size={28} className="text-[#B3B3B3]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-base truncate">Import from Spotify</p>
              <p className="text-[#B3B3B3] text-sm mt-0.5">Paste a playlist link</p>
            </div>
          </Link>
        </section>
      </div>
    </div>
  )
}

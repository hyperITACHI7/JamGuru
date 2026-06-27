import { Heart, Music } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'

export default function Library() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar showNav={false} />

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
          <h2 className="text-white font-bold text-lg mb-4">Playlists</h2>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#282828] flex items-center justify-center mb-4">
              <Music size={28} className="text-[#B3B3B3]" />
            </div>
            <p className="text-white font-semibold mb-1">Create your first playlist</p>
            <p className="text-[#B3B3B3] text-sm max-w-xs">It's easy — we'll help you get started.</p>
          </div>
        </section>
      </div>
    </div>
  )
}

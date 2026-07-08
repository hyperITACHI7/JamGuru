import { useState, useEffect } from 'react'
import { Heart, Music, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'
import { getPlaylists } from '../api/auth'

// Desktop: Import Playlist opens as a half-width panel over the current page instead of
// navigating away. Mobile keeps the normal full-page /import-playlist navigation.
function handleImportClick(e) {
  if (window.matchMedia('(min-width: 768px)').matches) {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('jam:open-import'))
  }
}

export default function Library() {
  const [playlists, setPlaylists] = useState([])

  useEffect(() => {
    getPlaylists().then(({ data }) => setPlaylists(data.playlists || [])).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />

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
              onClick={handleImportClick}
              className="w-8 h-8 rounded-full bg-[#282828] hover:bg-[#3e3e3e] flex items-center justify-center transition-colors"
              title="Import Spotify playlist"
            >
              <Plus size={18} className="text-white" />
            </Link>
          </div>

          {playlists.length === 0 ? (
            <Link
              to="/import-playlist"
              onClick={handleImportClick}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#ffffff0d] transition-colors"
            >
              <div className="w-16 h-16 flex-shrink-0 rounded-md bg-[#282828] flex items-center justify-center shadow-lg">
                <Music size={28} className="text-[#B3B3B3]" />
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-semibold text-base truncate">Import from Spotify</p>
                <p className="text-[#B3B3B3] text-sm mt-0.5">Shapes your taste profile</p>
              </div>
            </Link>
          ) : (
            <div className="flex flex-col gap-1">
              {playlists.map(pl => (
                <Link
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#ffffff0d] transition-colors"
                >
                  <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-[#282828] shadow-lg">
                    {pl.coverUrl
                      ? <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Music size={28} className="text-[#B3B3B3]" /></div>}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-white font-semibold text-base truncate">{pl.name}</p>
                    <p className="text-[#B3B3B3] text-sm mt-0.5">Playlist · {pl._count?.songs ?? 0} songs</p>
                  </div>
                </Link>
              ))}

              <Link
                to="/import-playlist"
                onClick={handleImportClick}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#ffffff0d] transition-colors mt-2"
              >
                <div className="w-16 h-16 flex-shrink-0 rounded-md bg-[#282828] flex items-center justify-center">
                  <Plus size={22} className="text-[#B3B3B3]" />
                </div>
                <div>
                  <p className="text-[#B3B3B3] text-sm font-medium">Import another playlist</p>
                  <p className="text-[#535353] text-xs mt-0.5">Shapes your taste profile</p>
                </div>
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

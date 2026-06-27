import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Search, Library, Plus, ChevronLeft, Heart, Crown, Music } from 'lucide-react'
import api from '../../api/axios'
import { getPlaylists } from '../../api/auth'

function SpotifyCircle() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white flex-shrink-0">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const [pendingCount, setPendingCount] = useState(0)
  const [playlists, setPlaylists] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getPlaylists().then(({ data }) => setPlaylists(data.playlists || [])).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/recommendations/pending-count')
      .then(({ data }) => setPendingCount(data.count))
      .catch(() => {})

    const refresh = () => {
      api.get('/recommendations/pending-count')
        .then(({ data }) => setPendingCount(data.count))
        .catch(() => {})
    }
    window.addEventListener('jam:like', refresh)
    return () => window.removeEventListener('jam:like', refresh)
  }, [])

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-4 px-3 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
      isActive ? 'text-white' : 'text-[#B3B3B3] hover:text-white'
    } ${collapsed ? 'justify-center px-2' : ''}`

  return (
    <aside
      className="flex-shrink-0 flex flex-col gap-2 h-full overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? '72px' : '280px' }}
    >
      {/* ── Top nav ── */}
      <nav className="bg-[#121212] rounded-xl px-2 py-2 flex-shrink-0">
        <div className={`flex items-center gap-2 px-2 py-3 ${collapsed ? 'justify-center' : ''}`}>
          <SpotifyCircle />
          {!collapsed && <span className="text-white font-bold text-lg tracking-tight overflow-hidden">JamGuru</span>}
        </div>

        <NavLink to="/" end className={navLinkClass} title={collapsed ? 'Home' : ''}>
          {({ isActive }) => (
            <>
              <Home size={24} strokeWidth={isActive ? 0 : 1.5} className={`flex-shrink-0 ${isActive ? 'fill-white' : ''}`} />
              {!collapsed && 'Home'}
            </>
          )}
        </NavLink>

        <NavLink to="/search" className={navLinkClass} title={collapsed ? 'Search' : ''}>
          {({ isActive }) => (
            <>
              <Search size={24} strokeWidth={isActive ? 2.5 : 1.5} className="flex-shrink-0" />
              {!collapsed && 'Search'}
            </>
          )}
        </NavLink>

        {/* ── JamGuru ── */}
        <div className="mt-2 pt-2 border-t border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 mb-1">
              <Crown size={11} className="text-[#1DB954]" />
              <span className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-widest">JamGuru</span>
            </div>
          )}
          <NavLink
            to="/jamguru"
            title={collapsed ? 'Discovery Inbox' : ''}
            className={({ isActive }) =>
              `flex items-center py-2 rounded-md transition-colors ${
                isActive ? 'bg-[#282828]' : 'hover:bg-[#1A1A1A]'
              } ${collapsed ? 'justify-center px-2' : 'gap-4 px-3'}`
            }
          >
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-900/30 relative">
              <Crown size={16} className="text-black fill-black" />
              {pendingCount > 0 && collapsed && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-white text-sm font-semibold leading-tight whitespace-nowrap">Discovery Inbox</p>
                <p className={`text-xs mt-0.5 font-medium ${pendingCount > 0 ? 'text-[#1DB954]' : 'text-[#B3B3B3]'}`}>
                  {pendingCount > 0
                    ? `${pendingCount} discover${pendingCount === 1 ? 'y' : 'ies'} waiting`
                    : 'All caught up'}
                </p>
              </div>
            )}
          </NavLink>
        </div>
      </nav>

      {/* ── Library ── */}
      <div className="bg-[#121212] rounded-xl flex-1 overflow-hidden flex flex-col min-h-0">
        <div className={`flex items-center pt-4 pb-2 flex-shrink-0 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <button
            onClick={() => collapsed && setCollapsed(false)}
            className="flex items-center gap-3 text-[#B3B3B3] hover:text-white font-semibold text-sm transition-colors"
            title={collapsed ? 'Your Library' : ''}
          >
            <Library size={24} className="flex-shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">Your Library</span>}
          </button>

          {!collapsed && (
            <div className="flex items-center gap-1">
              <button onClick={() => navigate('/import-playlist')} className="text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] p-2 rounded-full transition-colors" title="Import Spotify playlist">
                <Plus size={16} />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] p-2 rounded-full transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex gap-2 px-3 pb-3 flex-shrink-0">
            {['Playlists', 'Artists', 'Albums'].map(f => (
              <button
                key={f}
                className="bg-[#232323] hover:bg-[#2a2a2a] text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <NavLink
            to="/liked-songs"
            title={collapsed ? 'Liked Songs' : ''}
            className={({ isActive }) =>
              `flex items-center py-2 rounded-md transition-colors ${
                isActive ? 'bg-[#282828]' : 'hover:bg-[#1A1A1A]'
              } ${collapsed ? 'justify-center px-1' : 'gap-3 px-3'}`
            }
          >
            <div className="w-10 h-10 flex-shrink-0 rounded bg-gradient-to-br from-indigo-500 to-violet-800 flex items-center justify-center">
              <Heart size={14} className="fill-white text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-white text-sm font-medium truncate leading-tight">Liked Songs</p>
                <p className="text-[#B3B3B3] text-xs mt-0.5">Playlist</p>
              </div>
            )}
          </NavLink>

          {playlists.map(pl => (
            <NavLink
              key={pl.id}
              to={`/playlists/${pl.id}`}
              title={collapsed ? pl.name : ''}
              className={({ isActive }) =>
                `flex items-center py-2 rounded-md transition-colors ${
                  isActive ? 'bg-[#282828]' : 'hover:bg-[#1A1A1A]'
                } ${collapsed ? 'justify-center px-1' : 'gap-3 px-3'}`
              }
            >
              <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-[#282828]">
                {pl.coverUrl
                  ? <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-[#B3B3B3]" /></div>}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-white text-sm font-medium truncate leading-tight">{pl.name}</p>
                  <p className="text-[#B3B3B3] text-xs mt-0.5">Playlist</p>
                </div>
              )}
            </NavLink>
          ))}

          {!collapsed && (
            <button
              onClick={() => navigate('/import-playlist')}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#1A1A1A] transition-colors w-full text-left"
            >
              <div className="w-10 h-10 flex-shrink-0 rounded bg-[#282828] flex items-center justify-center">
                <Plus size={14} className="text-[#B3B3B3]" />
              </div>
              <p className="text-[#B3B3B3] text-sm">Import playlist</p>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

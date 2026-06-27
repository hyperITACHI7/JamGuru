import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, User } from 'lucide-react'

// Structural parent map — back button always goes to the expected parent,
// not the previous browser-history entry.
function getParentRoute(pathname) {
  if (pathname === '/') return null
  if (pathname === '/search')           return '/'
  if (pathname === '/jamguru')          return '/'
  if (pathname === '/library')          return '/'
  if (pathname === '/import-playlist')  return '/library'
  if (pathname.startsWith('/playlists/')) return '/library'
  if (pathname === '/liked-songs')      return '/library'
  if (pathname === '/friends')          return '/jamguru'
  if (pathname === '/groups')           return '/'
  if (pathname.startsWith('/groups/'))  return '/groups'
  if (pathname.startsWith('/profile'))  return '/'
  return '/'
}

export default function TopBar({ transparent = false, rightExtra = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const parentRoute = getParentRoute(location.pathname)
  const firstName = (user.displayName || '').split(' ')[0] || 'Profile'

  return (
    <div
      className={`flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0 ${
        transparent ? 'bg-transparent' : 'bg-[#121212]'
      }`}
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
    >
      {/* Back button — only shown when there is a structural parent */}
      <div className="flex items-center">
        {parentRoute ? (
          <button
            onClick={() => navigate(parentRoute)}
            className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <div className="w-8 h-8" />
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Desktop-only extras */}
        <button className="hidden md:block bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full hover:scale-105 transition-transform">
          Upgrade
        </button>

        {/* Profile — avatar + first name on mobile, full name pill on desktop */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 bg-[#282828] hover:bg-[#3E3E3E] rounded-full pl-1 pr-3 py-1 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#535353] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.displayName?.[0]?.toUpperCase() ?? <User size={14} />}
          </div>
          {/* mobile: first name only; desktop: full display name */}
          <span className="md:hidden text-white text-sm font-semibold max-w-[80px] truncate">
            {firstName}
          </span>
          <span className="hidden md:inline text-white text-sm font-semibold max-w-[100px] truncate">
            {user.displayName || 'Profile'}
          </span>
        </button>

        {/* rightExtra — e.g. messages button on Discovery page */}
        {rightExtra}
      </div>
    </div>
  )
}

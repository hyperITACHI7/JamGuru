import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Bell, User } from 'lucide-react'

export default function TopBar({ transparent = false, showNav = true, rightExtra = null }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <div
      className={`flex items-center justify-between px-6 py-3 flex-shrink-0 ${
        transparent ? 'bg-transparent' : 'bg-[#121212]'
      }`}
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
    >
      {/* Back / Forward — hidden on pages that pass showNav={false} */}
      <div className="flex items-center gap-2">
        {showNav && (
          <>
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button className="hidden md:block bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full hover:scale-105 transition-transform">
          Upgrade
        </button>

        <button className="hidden md:block text-[#B3B3B3] hover:text-white transition-colors">
          <Bell size={18} />
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 bg-[#282828] hover:bg-[#3E3E3E] rounded-full pl-1 pr-3 py-1 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#535353] flex items-center justify-center text-white text-xs font-bold">
            {user.displayName?.[0]?.toUpperCase() ?? <User size={14} />}
          </div>
          <span className="hidden md:inline text-white text-sm font-semibold max-w-[100px] truncate">
            {user.displayName || 'Profile'}
          </span>
        </button>

        {rightExtra}
      </div>
    </div>
  )
}

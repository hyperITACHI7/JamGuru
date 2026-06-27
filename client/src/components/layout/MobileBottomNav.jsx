import { NavLink } from 'react-router-dom'
import { Home, Search, Crown, Library } from 'lucide-react'

const items = [
  { to: '/',        label: 'Home',    Icon: Home,    end: true  },
  { to: '/search',  label: 'Search',  Icon: Search,  end: false },
  { to: '/jamguru', label: 'Inbox',   Icon: Crown,   end: false },
  { to: '/library', label: 'Library', Icon: Library, end: false },
]

export default function MobileBottomNav() {
  return (
    <nav className="flex-shrink-0 bg-[#121212] border-t border-white/10 flex items-center justify-around px-1 pt-2 pb-4">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 flex-1 py-1 rounded-lg transition-colors ${
              isActive ? 'text-white' : 'text-[#B3B3B3]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={23}
                strokeWidth={isActive ? 2.5 : 1.5}
                className={`flex-shrink-0 ${isActive ? 'text-[#1DB954]' : ''}`}
              />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-[#1DB954]' : ''}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import NowPlayingBar from './NowPlayingBar'
import MobileBottomNav from './MobileBottomNav'
import { usePlayer } from '../../context/PlayerContext'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const SSE_EVENTS = ['new_dm_rec', 'new_dm_req', 'new_group_activity']

function useSseConnection() {
  const esRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let retryTimer = null

    function connect() {
      const es = new EventSource(`${API_BASE}/api/events?token=${encodeURIComponent(token)}`)
      esRef.current = es

      SSE_EVENTS.forEach(type => {
        es.addEventListener(type, e => {
          window.dispatchEvent(new CustomEvent('jam:sse', {
            detail: { type, ...JSON.parse(e.data) },
          }))
        })
      })

      es.onerror = () => {
        es.close()
        if (localStorage.getItem('token')) {
          retryTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimer)
      esRef.current?.close()
    }
  }, [])
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  return isMobile
}

export default function SpotifyLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const { track } = usePlayer()
  const isMobile = useIsMobile()
  const location = useLocation()
  useSseConnection()

  // Mobile layout — no sidebar, bottom nav only on home
  if (isMobile) {
    const isHome = location.pathname === '/'
    return (
      <div className="h-[100dvh] flex flex-col bg-black overflow-hidden">
        <main className="flex-1 bg-[#121212] overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
        {track && <NowPlayingBar />}
        {isHome && <MobileBottomNav />}
      </div>
    )
  }

  // Desktop layout — unchanged
  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      <div className={`flex gap-2 p-2 min-h-0 ${track ? 'flex-1 pb-0' : 'flex-1 pb-2'}`}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="flex-1 bg-[#121212] rounded-xl overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>
      {track && <NowPlayingBar />}
    </div>
  )
}

import { useState } from 'react'
import Sidebar from './Sidebar'
import NowPlayingBar from './NowPlayingBar'
import { usePlayer } from '../../context/PlayerContext'

export default function SpotifyLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const { track } = usePlayer()

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

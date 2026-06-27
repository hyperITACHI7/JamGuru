import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PlayerProvider } from './context/PlayerContext'
import SpotifyLayout from './components/layout/SpotifyLayout'
import Home            from './pages/Home'
import Search          from './pages/Search'
import JamGuru         from './pages/JamGuru'
import Profile         from './pages/Profile'
import Login           from './pages/Login'
import Register        from './pages/Register'
import SpotifyCallback from './pages/SpotifyCallback'
import PrivacyPolicy  from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Friends     from './phase3/pages/Friends'
import Groups      from './phase5/pages/Groups'
import GroupDetail from './phase5/pages/GroupDetail'
import LikedSongs  from './pages/LikedSongs'
import Library     from './pages/Library'

function ProtectedRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}

function AppLayout({ children }) {
  return (
    <ProtectedRoute>
      <SpotifyLayout>{children}</SpotifyLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <PlayerProvider>
    <BrowserRouter>
      <Routes>
        {/* Auth pages — no layout */}
        <Route path="/login"             element={<Login />} />
        <Route path="/register"          element={<Register />} />
        <Route path="/spotify-callback"  element={<SpotifyCallback />} />
        <Route path="/privacy"           element={<PrivacyPolicy />} />
        <Route path="/terms"             element={<TermsOfService />} />

        {/* App pages — full Spotify layout */}
        <Route path="/"                  element={<AppLayout><Home /></AppLayout>} />
        <Route path="/search"            element={<AppLayout><Search /></AppLayout>} />
        <Route path="/jamguru"           element={<AppLayout><JamGuru /></AppLayout>} />
        <Route path="/profile"           element={<AppLayout><Profile /></AppLayout>} />
        <Route path="/profile/:username" element={<AppLayout><Profile /></AppLayout>} />
        <Route path="/friends"           element={<AppLayout><Friends /></AppLayout>} />
        <Route path="/groups"            element={<AppLayout><Groups /></AppLayout>} />
        <Route path="/groups/:id"        element={<AppLayout><GroupDetail /></AppLayout>} />
        <Route path="/liked-songs"       element={<AppLayout><LikedSongs /></AppLayout>} />
        <Route path="/library"           element={<AppLayout><Library /></AppLayout>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </PlayerProvider>
  )
}

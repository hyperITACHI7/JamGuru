import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Crown, Sparkles, RefreshCw, UserPlus, UserCheck } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import { getMe } from '../api/auth'
import { getProfile, updateProfile } from '../api/users'
import { getTaste, getTasteByUser, updateTaste, refreshTaste } from '../api/taste'
import { sendFriendRequest } from '../phase3/api/friends'

const GENRE_OPTIONS = [
  'hip-hop', 'r&b', 'pop', 'rock', 'indie', 'electronic',
  'jazz', 'classical', 'metal', 'latin', 'soul', 'folk', 'reggae', 'country',
]
const MOOD_OPTIONS = [
  'chill', 'party', 'late night', 'workout', 'focus', 'road trip',
  'heartbreak', 'happy', 'nostalgic', 'romantic',
]
const ERA_OPTIONS = ['80s', '90s', '2000s', '2010s', 'current']

function Avatar({ user, size = 'xl' }) {
  const cls = size === 'xl' ? 'w-40 h-40 text-6xl' : 'w-10 h-10 text-lg'
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.displayName} className={`${cls} rounded-full object-cover shadow-2xl`} />
  }
  return (
    <div className={`${cls} rounded-full bg-[#535353] flex items-center justify-center font-bold text-white shadow-2xl`}>
      {user.displayName?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function TasteTag({ label, pinned }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
      pinned
        ? 'bg-[#1DB954]/20 border-[#1DB954]/50 text-[#1DB954]'
        : 'bg-[#282828] border-[#535353] text-[#B3B3B3]'
    }`}>
      {label}
      {!pinned && <Sparkles size={9} className="text-[#535353]" />}
    </span>
  )
}

function TasteSection({ label, tags, pinned = {} }) {
  if (!tags || tags.length === 0) return null
  const pinnedSet = new Set(Object.values(pinned).flat())
  return (
    <div className="flex items-start gap-3">
      <span className="text-[#535353] text-xs font-semibold uppercase tracking-wider w-16 pt-1 flex-shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <TasteTag key={t} label={t} pinned={pinnedSet.has(t)} />
        ))}
      </div>
    </div>
  )
}

function ChipToggle({ options, selected, onChange }) {
  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            selected.includes(opt)
              ? 'bg-[#1DB954]/20 border-[#1DB954]/50 text-[#1DB954]'
              : 'border-[#535353] text-[#B3B3B3] hover:border-white hover:text-white'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()

  const [user, setUser]               = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [friendStatus, setFriendStatus] = useState(null)
  const [addingFriend, setAddingFriend] = useState(false)
  const [editing, setEditing]         = useState(false)
  const [form, setForm]               = useState({ displayName: '', bio: '' })
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [pageError, setPageError]     = useState('')
  const [saveError, setSaveError]     = useState('')

  // Taste profile state
  const [taste, setTaste]             = useState(null)
  const [editingTaste, setEditingTaste] = useState(false)
  const [tasteForm, setTasteForm]     = useState({ genres: [], moods: [], artists: [], eras: [] })
  const [artistInput, setArtistInput] = useState('')
  const [refreshingTaste, setRefreshingTaste] = useState(false)
  const [tasteSaving, setTasteSaving] = useState(false)

  useEffect(() => { loadProfile() }, [username])

  async function loadProfile() {
    setLoading(true)
    setPageError('')
    try {
      if (!username) {
        const { data } = await getMe()
        setUser(data)
        setForm({ displayName: data.displayName, bio: data.bio ?? '' })
        setIsOwnProfile(true)
        loadTaste(null)
      } else {
        const [profileRes, meRes] = await Promise.allSettled([getProfile(username), getMe()])
        if (profileRes.status === 'rejected') { setPageError('User not found.'); return }

        const profileData = profileRes.value.data
        setUser(profileData)
        const mine = meRes.status === 'fulfilled' && meRes.value.data.username === username
        setIsOwnProfile(mine)
        if (!mine) setFriendStatus(profileData.friendshipStatus ?? null)
        if (mine) setForm({ displayName: profileData.displayName, bio: profileData.bio ?? '' })
        loadTaste(mine ? null : username)
      }
    } catch {
      setPageError('Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  async function loadTaste(u) {
    try {
      const { data } = u ? await getTasteByUser(u) : await getTaste()
      setTaste(data)
      setTasteForm({
        genres:  data.genres  ?? [],
        moods:   data.moods   ?? [],
        artists: data.artists ?? [],
        eras:    data.eras    ?? [],
      })
      setArtistInput((data.artists ?? []).join(', '))
    } catch {
      // taste profile not yet generated — fine
    }
  }

  async function handleSave() {
    setSaveError('')
    setSaving(true)
    try {
      const { data } = await updateProfile(form)
      setUser(prev => ({ ...prev, ...data }))
      localStorage.setItem('user', JSON.stringify({ ...user, ...data }))
      setEditing(false)
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTasteSave() {
    setTasteSaving(true)
    try {
      const artists = artistInput.split(',').map(a => a.trim()).filter(Boolean)
      const payload = { ...tasteForm, artists }
      const { data } = await updateTaste(payload)
      setTaste(data)
      setEditingTaste(false)
    } catch {
      // silently fail
    } finally {
      setTasteSaving(false)
    }
  }

  async function handleTasteRefresh() {
    setRefreshingTaste(true)
    try {
      const { data } = await refreshTaste()
      setTaste(data)
      setTasteForm({
        genres:  data.genres  ?? [],
        moods:   data.moods   ?? [],
        artists: data.artists ?? [],
        eras:    data.eras    ?? [],
      })
      setArtistInput((data.artists ?? []).join(', '))
    } catch {
      // silently fail
    } finally {
      setRefreshingTaste(false)
    }
  }

  async function handleAddFriend() {
    setAddingFriend(true)
    try {
      await sendFriendRequest(user.id)
      setFriendStatus('PENDING_SENT')
    } catch (e) {
      if (e.response?.data?.error === 'Already friends') setFriendStatus('ACCEPTED')
    } finally {
      setAddingFriend(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const hasTaste = taste && (
    taste.genres?.length || taste.moods?.length ||
    taste.artists?.length || taste.eras?.length
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar showNav={false} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#B3B3B3] animate-pulse">Loading…</p>
        </div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="flex flex-col h-full">
        <TopBar showNav={false} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-[#B3B3B3]">{pageError}</p>
          <Link to="/profile" className="text-[#1DB954] hover:underline text-sm">Go to your profile</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Gradient header */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/60 via-[#121212]/50 to-transparent pointer-events-none" />
        <TopBar transparent showNav={false} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile hero */}
        <div className="px-6 pt-4 pb-6 bg-gradient-to-b from-indigo-900/30 to-transparent">
          <div className="flex items-end gap-6">
            <Avatar user={user} />
            <div className="pb-1">
              <p className="text-[#B3B3B3] text-xs font-bold uppercase tracking-widest mb-1">Profile</p>
              <h1 className="text-white font-black text-5xl mb-3 leading-none">{user.displayName}</h1>
              {user.bio && <p className="text-[#B3B3B3] text-sm mb-1">{user.bio}</p>}
              <p className="text-white text-sm">
                <span className="font-bold">{user.jamGuruForCount ?? 0}</span>{' '}
                <span className="text-[#B3B3B3]">listener{user.jamGuruForCount !== 1 ? 's' : ''} this month</span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => { setEditing(v => !v); setEditingTaste(false) }}
                  className="border border-[#878787] hover:border-white text-white text-sm font-semibold px-6 py-1.5 rounded-full transition-colors"
                >
                  {editing ? 'Cancel' : 'Edit profile'}
                </button>
                <button
                  onClick={() => { setEditingTaste(v => !v); setEditing(false) }}
                  className="border border-[#878787] hover:border-white text-white text-sm font-semibold px-6 py-1.5 rounded-full transition-colors"
                >
                  {editingTaste ? 'Cancel' : 'Edit taste'}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-[#B3B3B3] hover:text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              /* Add Friend button for other users' profiles */
              friendStatus === 'ACCEPTED' ? (
                <div className="flex items-center gap-2 border border-[#1DB954]/40 text-[#1DB954] text-sm font-semibold px-5 py-1.5 rounded-full">
                  <UserCheck size={15} /> Friends
                </div>
              ) : (
                <button
                  onClick={handleAddFriend}
                  disabled={addingFriend || friendStatus === 'PENDING_SENT'}
                  className="flex items-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black text-sm font-bold px-5 py-1.5 rounded-full transition-colors disabled:opacity-60"
                >
                  {friendStatus === 'PENDING_SENT' ? (
                    <><UserCheck size={15} /> Requested</>
                  ) : (
                    <><UserPlus size={15} /> {addingFriend ? 'Adding…' : 'Add Friend'}</>
                  )}
                </button>
              )
            )}
          </div>

          {/* Edit profile form */}
          {editing && (
            <div className="bg-[#282828] rounded-xl p-5 space-y-4 max-w-lg">
              <h2 className="text-white font-bold">Edit profile</h2>
              <div className="space-y-1">
                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Display name</label>
                <input
                  value={form.displayName}
                  onChange={e => setForm({ ...form, displayName: e.target.value })}
                  className="w-full bg-[#3E3E3E] text-white px-3 py-2.5 rounded-md border border-transparent focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  placeholder="Tell people about your music taste…"
                  className="w-full bg-[#3E3E3E] text-white px-3 py-2.5 rounded-md border border-transparent focus:outline-none focus:border-[#1DB954] resize-none placeholder-[#6a6a6a] transition-colors"
                />
              </div>
              {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-black font-bold px-6 py-2 rounded-full hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}

          {/* Taste profile — display */}
          {hasTaste && !editingTaste && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-white font-bold text-xl">Taste Profile</h2>
                {taste.updatedAt && (
                  <span className="text-[#535353] text-xs">
                    Updated {new Date(taste.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="bg-[#181818] rounded-xl p-4 space-y-3">
                <TasteSection label="Genres"  tags={taste.genres}  pinned={taste.pinned} />
                <TasteSection label="Moods"   tags={taste.moods}   pinned={taste.pinned} />
                <TasteSection label="Artists" tags={taste.artists} pinned={taste.pinned} />
                <TasteSection label="Era"     tags={taste.eras}    pinned={taste.pinned} />
                <p className="text-[#535353] text-[10px] pt-1">
                  <Sparkles size={9} className="inline mr-1" />AI-suggested · click "Edit taste" to personalise
                </p>
              </div>
            </div>
          )}

          {/* Taste profile — not yet generated */}
          {!hasTaste && isOwnProfile && !editingTaste && (
            <div className="bg-[#181818] rounded-xl p-4">
              <p className="text-[#B3B3B3] text-sm mb-3">
                No taste profile yet. Sync your Spotify liked songs or set it manually.
              </p>
              <button
                onClick={handleTasteRefresh}
                disabled={refreshingTaste}
                className="flex items-center gap-2 text-[#1DB954] text-sm font-semibold hover:underline disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshingTaste ? 'animate-spin' : ''} />
                {refreshingTaste ? 'Analysing…' : 'Generate with AI'}
              </button>
            </div>
          )}

          {/* Taste profile — edit form */}
          {editingTaste && isOwnProfile && (
            <div className="bg-[#282828] rounded-xl p-5 space-y-5 max-w-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold">Edit taste profile</h2>
                <button
                  onClick={handleTasteRefresh}
                  disabled={refreshingTaste}
                  className="flex items-center gap-1.5 text-[#1DB954] text-xs font-semibold hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={11} className={refreshingTaste ? 'animate-spin' : ''} />
                  {refreshingTaste ? 'Analysing…' : 'Refresh with AI'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Genres</label>
                <ChipToggle
                  options={GENRE_OPTIONS}
                  selected={tasteForm.genres}
                  onChange={v => setTasteForm(f => ({ ...f, genres: v }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Moods</label>
                <ChipToggle
                  options={MOOD_OPTIONS}
                  selected={tasteForm.moods}
                  onChange={v => setTasteForm(f => ({ ...f, moods: v }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Artists</label>
                <input
                  value={artistInput}
                  onChange={e => setArtistInput(e.target.value)}
                  placeholder="The Weeknd, SZA, Kendrick Lamar…"
                  className="w-full bg-[#3E3E3E] text-white px-3 py-2.5 rounded-md border border-transparent focus:outline-none focus:border-[#1DB954] transition-colors placeholder-[#6a6a6a] text-sm"
                />
                <p className="text-[#535353] text-xs">Comma-separated</p>
              </div>

              <div className="space-y-2">
                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Era</label>
                <ChipToggle
                  options={ERA_OPTIONS}
                  selected={tasteForm.eras}
                  onChange={v => setTasteForm(f => ({ ...f, eras: v }))}
                />
              </div>

              <button
                onClick={handleTasteSave}
                disabled={tasteSaving}
                className="bg-white text-black font-bold px-6 py-2 rounded-full hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {tasteSaving ? 'Saving…' : 'Save taste profile'}
              </button>
            </div>
          )}

          {/* JamGuru badge */}
          <div>
            <h2 className="text-white font-bold text-xl mb-4">JamGuru</h2>
            <div className="flex items-center gap-4 bg-[#181818] hover:bg-[#282828] transition-colors rounded-xl p-4 max-w-sm">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center flex-shrink-0">
                <Crown size={24} className="text-black fill-black" />
              </div>
              <div>
                <p className="text-white font-semibold">
                  JamGuru for{' '}
                  <span className="text-[#1DB954]">{user.jamGuruForCount ?? 0}</span>{' '}
                  listener{user.jamGuruForCount !== 1 ? 's' : ''}
                </p>
                <p className="text-[#B3B3B3] text-xs mt-0.5">This month's recommendations</p>
              </div>
            </div>
          </div>

          {/* Member since */}
          <p className="text-[#6a6a6a] text-xs">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}

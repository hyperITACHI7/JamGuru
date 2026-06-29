import { useState, useEffect, useCallback, Component } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, UserPlus, ArrowLeft, BarChart2, X, Globe, Lock, Settings, Sparkles, Plus } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import GroupFeedCard from '../components/GroupFeedCard'
import { getGroup, getGroupFeed, getGroupScore, addMember, removeMember, updateGroup, updateGroupTaste, generateGroupTasteAI } from '../api/groups'
import { searchUsers } from '../../phase3/api/friends'

const me = () => JSON.parse(localStorage.getItem('user') || '{}')

class GroupErrorBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0 px-6 text-center">
          <p className="text-white font-semibold">Something went wrong loading this group</p>
          <button
            onClick={() => { this.setState({ crashed: false }); window.location.reload() }}
            className="text-[#1DB954] text-sm hover:underline"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Score Widget ──────────────────────────────────────────────────────────────

function ScoreWidget({ groupId }) {
  const [score, setScore] = useState(null)

  useEffect(() => {
    getGroupScore(groupId)
      .then(({ data }) => setScore(data))
      .catch(() => {})
  }, [groupId])

  if (!score) return null

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/20 border border-purple-500/20 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={16} className="text-purple-400" />
        <span className="text-purple-300 text-xs font-bold uppercase tracking-widest">Group Score</span>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-white font-black text-3xl">{score.dailyScore.toFixed(3)}</p>
          <p className="text-[#B3B3B3] text-xs mt-0.5">Today</p>
        </div>
        <div className="border-l border-white/10 pl-6">
          <p className="text-white font-black text-3xl">{score.monthlyScore.toFixed(3)}</p>
          <p className="text-[#B3B3B3] text-xs mt-0.5">This Month</p>
        </div>
      </div>
      <p className="text-[#6a6a6a] text-[10px] mt-3">
        {score.today.likesReceived} likes · {score.today.recsSent} songs · {score.today.groupSize} members today
      </p>
    </div>
  )
}

// ── Member List ───────────────────────────────────────────────────────────────

function MemberList({ group, onMemberRemoved }) {
  const currentUser = me()
  const isCreator   = group.createdBy === currentUser.id
  const members     = group.members ?? []

  async function handleRemove(userId) {
    try {
      await removeMember(group.id, userId)
      onMemberRemoved(userId)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="mb-6">
      <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">
        Members · {members.length}
      </p>
      <div className="flex flex-wrap gap-2">
        {members.map(m => (
          <div
            key={m.userId}
            className="flex items-center gap-2 bg-[#282828] rounded-full pl-1 pr-3 py-1"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-white text-xs font-bold">
              {m.user.displayName?.[0]?.toUpperCase()}
            </div>
            <span className="text-white text-sm">{m.user.displayName}</span>
            {isCreator && m.userId !== currentUser.id && (
              <button
                onClick={() => handleRemove(m.userId)}
                className="text-[#B3B3B3] hover:text-red-400 transition-colors ml-0.5"
                title="Remove member"
              >
                <X size={12} />
              </button>
            )}
            {!isCreator && m.userId === currentUser.id && (
              <button
                onClick={() => handleRemove(m.userId)}
                className="text-[#B3B3B3] hover:text-red-400 transition-colors ml-0.5"
                title="Leave group"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Add Member Panel ──────────────────────────────────────────────────────────

function AddMemberPanel({ group, onAdded }) {
  const [query, setQuery]   = useState('')
  const [results, setRes]   = useState([])
  const [searching, setS]   = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')

  const memberIds = new Set((group.members ?? []).map(m => m.userId))

  useEffect(() => {
    if (query.trim().length < 2) { setRes([]); return }
    const t = setTimeout(async () => {
      setS(true)
      try { const { data } = await searchUsers(query.trim()); setRes(data) }
      finally { setS(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function handleAdd(userId) {
    setBusy(true)
    setError('')
    try {
      const { data } = await addMember(group.id, userId)
      onAdded(data)
      setQuery('')
      setRes([])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add member')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-6">
      <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-2">
        Add Member
      </p>
      <div className="relative max-w-sm">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="w-full bg-[#282828] text-white text-sm py-2.5 px-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-[#6a6a6a]"
        />
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      <div className="mt-2 space-y-1 max-w-sm">
        {searching && <p className="text-[#B3B3B3] text-xs">Searching…</p>}
        {!searching && results.filter(u => !memberIds.has(u.id)).map(u => (
          <div key={u.id} className="flex items-center gap-3 px-3 py-2 bg-[#1a1a1a] rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-white text-xs font-bold">
              {u.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{u.displayName}</p>
              <p className="text-[#B3B3B3] text-xs">@{u.username}</p>
            </div>
            <button
              onClick={() => handleAdd(u.id)}
              disabled={busy}
              className="flex items-center gap-1 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#e6e6e6] transition-colors disabled:opacity-50"
            >
              <UserPlus size={12} /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Group Taste Panel (creator only) ─────────────────────────────────────────

const TASTE_CATEGORIES = [
  { field: 'tasteGenres',  label: 'Genres' },
  { field: 'tasteMoods',   label: 'Moods' },
  { field: 'tasteArtists', label: 'Artists' },
  { field: 'tasteEras',    label: 'Eras' },
]

function GroupTastePanel({ group, onUpdated }) {
  const [taste, setTaste] = useState({
    tasteGenres:  group.tasteGenres  ?? [],
    tasteMoods:   group.tasteMoods   ?? [],
    tasteArtists: group.tasteArtists ?? [],
    tasteEras:    group.tasteEras    ?? [],
  })
  const [inputs,     setInputs]     = useState({ tasteGenres: '', tasteMoods: '', tasteArtists: '', tasteEras: '' })
  const [generating, setGenerating] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [saved,      setSaved]      = useState(false)

  const isEmpty = TASTE_CATEGORIES.every(c => !taste[c.field]?.length)

  function addTag(field) {
    const tag = inputs[field].trim()
    if (!tag || taste[field].includes(tag)) return
    setTaste(prev => ({ ...prev, [field]: [...prev[field], tag] }))
    setInputs(prev => ({ ...prev, [field]: '' }))
  }

  function removeTag(field, tag) {
    setTaste(prev => ({ ...prev, [field]: prev[field].filter(t => t !== tag) }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const { data } = await generateGroupTasteAI(group.id)
      setTaste({ tasteGenres: data.tasteGenres, tasteMoods: data.tasteMoods, tasteArtists: data.tasteArtists, tasteEras: data.tasteEras })
      onUpdated({ ...group, ...data })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.response?.data?.error || 'AI generation failed. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const { data } = await updateGroupTaste(group.id, taste)
      onUpdated({ ...group, ...data })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const dirty = TASTE_CATEGORIES.some(c => JSON.stringify(taste[c.field]) !== JSON.stringify(group[c.field] ?? []))

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest">Group Taste Profile</p>
          <p className="text-[#535353] text-[10px] mt-0.5">Used by AI Suggest to pick songs that fit the group</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors disabled:opacity-40"
        >
          <Sparkles size={12} />
          {generating ? 'Generating…' : 'Generate with AI'}
        </button>
      </div>

      {isEmpty && !generating && (
        <p className="text-[#535353] text-xs mb-4">
          No taste profile set yet — generate one with AI or add tags manually below.
        </p>
      )}

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      <div className="space-y-4">
        {TASTE_CATEGORIES.map(({ field, label }) => (
          <div key={field}>
            <p className="text-[#6a6a6a] text-[10px] font-semibold uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {taste[field].map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(field, tag)}
                    className="opacity-50 hover:opacity-100 transition-opacity ml-0.5"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-xs">
              <input
                value={inputs[field]}
                onChange={e => setInputs(prev => ({ ...prev, [field]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addTag(field)}
                placeholder={`Add ${label.toLowerCase().slice(0, -1)}…`}
                className="flex-1 bg-[#282828] text-white text-xs rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-[#535353]"
              />
              <button
                onClick={() => addTag(field)}
                disabled={!inputs[field].trim()}
                className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center disabled:opacity-30 hover:bg-purple-500/20 transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="mt-5 w-full bg-purple-600 text-white font-bold py-3 rounded-full hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Taste Profile'}
      </button>
    </div>
  )
}

// ── Settings Panel (creator only) ─────────────────────────────────────────────

function SettingsPanel({ group, onUpdated }) {
  const [description, setDesc] = useState(group.description ?? '')
  const [isPublic, setPublic]  = useState(group.isPublic ?? false)
  const [saving, setSaving]    = useState(false)
  const [error, setError]      = useState('')
  const [saved, setSaved]      = useState(false)

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { data } = await updateGroup(group.id, { description, isPublic })
      onUpdated(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const dirty = description !== (group.description ?? '') || isPublic !== (group.isPublic ?? false)

  return (
    <div className="max-w-md space-y-5">
      {/* Visibility toggle */}
      <div>
        <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-2">Visibility</p>
        <button
          onClick={() => setPublic(p => !p)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors border ${
            isPublic
              ? 'bg-[#1DB954]/10 border-[#1DB954]/40 text-[#1DB954]'
              : 'bg-[#282828] border-transparent text-[#B3B3B3]'
          }`}
        >
          {isPublic ? <Globe size={16} /> : <Lock size={16} />}
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">{isPublic ? 'Public' : 'Private'}</p>
            <p className="text-[10px] opacity-70">
              {isPublic ? 'Anyone can find and join this group' : 'Only invited members can join'}
            </p>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${isPublic ? 'bg-[#1DB954]' : 'bg-[#535353]'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest">Description</p>
          <span className="text-[#6a6a6a] text-[10px]">{description.length}/280</span>
        </div>
        <textarea
          value={description}
          onChange={e => setDesc(e.target.value.slice(0, 280))}
          placeholder="Tell members what this group is about…"
          rows={3}
          className="w-full bg-[#282828] text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-[#6a6a6a] resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
      </button>

      <GroupTastePanel group={group} onUpdated={onUpdated} />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

function GroupDetailInner() {
  const { id }                  = useParams()
  const [group, setGroup]       = useState(null)
  const [feed, setFeed]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [scoreKey, setScoreKey] = useState(0)
  const [tab, setTab]           = useState('feed')
  const currentUser             = me()
  const isCreator               = group?.createdBy === currentUser.id

  const loadFeed = useCallback(() => {
    getGroupFeed(id).then(({ data }) => setFeed(data)).catch(() => {})
  }, [id])

  useEffect(() => {
    Promise.all([getGroup(id), getGroupFeed(id)])
      .then(([{ data: g }, { data: f }]) => {
        setGroup(g)
        setFeed(f)
      })
      .finally(() => setLoading(false))
  }, [id])

  function handleMemberRemoved(userId) {
    setGroup(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== userId) }))
  }

  function handleMembersUpdated(updatedGroup) {
    setGroup(updatedGroup)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0">
        <p className="text-[#B3B3B3]">Loading…</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        <p className="text-white font-semibold">Group not found</p>
        <Link to="/groups" className="text-[#1DB954] text-sm hover:underline">← Back to Groups</Link>
      </div>
    )
  }

  const tabs = ['feed', 'members', ...(isCreator ? ['settings'] : [])]

  const members = group.members ?? []
  const creatorName = group.creator?.displayName ?? 'Unknown'

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/60 via-[#121212]/60 to-transparent pointer-events-none" />
        <TopBar transparent />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <Link to="/groups" className="inline-flex items-center gap-1.5 text-[#B3B3B3] hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft size={15} /> Groups
        </Link>

        {/* Group header */}
        <div className="flex items-end gap-6 mb-4">
          <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center shadow-xl shadow-purple-900/40 flex-shrink-0">
            <Users size={40} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[#B3B3B3] text-xs font-bold uppercase tracking-widest">Group</p>
              {group.isPublic
                ? <span className="flex items-center gap-1 text-[#1DB954] text-[10px] font-bold"><Globe size={10} /> Public</span>
                : <span className="flex items-center gap-1 text-[#6a6a6a] text-[10px] font-bold"><Lock size={10} /> Private</span>
              }
            </div>
            <h1 className="text-white font-black text-3xl mb-1 truncate">{group.name}</h1>
            <p className="text-[#B3B3B3] text-sm">
              {members.length} member{members.length !== 1 ? 's' : ''} · Created by {creatorName}
            </p>
          </div>
        </div>

        {/* Description */}
        {group.description && (
          <p className="text-[#B3B3B3] text-sm mb-6 max-w-2xl leading-relaxed">{group.description}</p>
        )}

        <ScoreWidget key={scoreKey} groupId={id} />

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-[#1a1a1a] rounded-full p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors capitalize flex items-center gap-1.5 ${
                tab === t ? 'bg-white text-black' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              {t === 'settings' && <Settings size={12} />}
              {t}
            </button>
          ))}
        </div>

        {tab === 'feed' && (
          <>
            {feed.length === 0 && (
              <p className="text-[#B3B3B3] text-sm text-center py-12">
                No songs yet — share something with the group!
              </p>
            )}
            <div className="space-y-2 max-w-2xl">
              {feed.map(rec => (
                <GroupFeedCard
                  key={rec.id}
                  rec={rec}
                  groupId={id}
                  onLikeChange={() => setScoreKey(k => k + 1)}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'members' && (
          <>
            <MemberList group={group} onMemberRemoved={handleMemberRemoved} />
            {isCreator && (
              <AddMemberPanel group={group} onAdded={handleMembersUpdated} />
            )}
          </>
        )}

        {tab === 'settings' && isCreator && (
          <SettingsPanel group={group} onUpdated={setGroup} />
        )}
      </div>
    </div>
  )
}

export default function GroupDetail() {
  return (
    <GroupErrorBoundary>
      <GroupDetailInner />
    </GroupErrorBoundary>
  )
}

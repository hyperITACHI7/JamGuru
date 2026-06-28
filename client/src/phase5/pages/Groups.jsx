import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, X, Check, ChevronRight, Search, Globe, Lock, UserPlus } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { getGroups, createGroup, searchPublicGroups, joinPublicGroup } from '../api/groups'
import { getFriends } from '../../phase3/api/friends'

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [isPublic, setPublic]     = useState(false)
  const [friends, setFriends]     = useState([])
  const [selected, setSelected]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    getFriends()
      .then(({ data }) => setFriends(data))
      .catch(() => setError('Could not load friends'))
      .finally(() => setLoading(false))
  }, [])

  function toggleMember(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    if (!name.trim()) return setError('Group name is required')
    setSaving(true)
    setError('')
    try {
      const { data } = await createGroup({ name: name.trim(), description, isPublic, memberIds: selected })
      onCreated(data)
      onClose()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create group')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#282828] rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-xl">Create Group</h2>
          <button onClick={onClose} className="text-[#B3B3B3] hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 60))}
          placeholder="Group name…"
          className="w-full bg-[#3e3e3e] text-white text-sm rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-[#6a6a6a]"
        />

        <textarea
          value={description}
          onChange={e => setDesc(e.target.value.slice(0, 280))}
          placeholder="Description (optional) — what's this group about?"
          rows={2}
          className="w-full bg-[#3e3e3e] text-white text-sm rounded-xl px-4 py-3 mb-1 focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-[#6a6a6a] resize-none"
        />
        <p className="text-[#6a6a6a] text-[10px] text-right mb-3">{description.length}/280</p>

        {/* Public / Private toggle */}
        <button
          onClick={() => setPublic(p => !p)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-4 transition-colors border ${
            isPublic
              ? 'bg-[#1DB954]/10 border-[#1DB954]/40 text-[#1DB954]'
              : 'bg-[#3e3e3e] border-transparent text-[#B3B3B3]'
          }`}
        >
          {isPublic ? <Globe size={16} /> : <Lock size={16} />}
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">{isPublic ? 'Public group' : 'Private group'}</p>
            <p className="text-[10px] opacity-70">
              {isPublic ? 'Anyone can find and join this group' : 'Only invited members can join'}
            </p>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${isPublic ? 'bg-[#1DB954]' : 'bg-[#535353]'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>

        {!loading && friends.length > 0 && (
          <>
            <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-2">
              Add Friends (optional)
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto mb-4">
              {friends.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleMember(f.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                    selected.includes(f.id)
                      ? 'bg-[#1DB954]/15 ring-1 ring-[#1DB954]/40'
                      : 'hover:bg-[#3e3e3e]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {f.displayName?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-white text-sm flex-1">{f.displayName}</span>
                  {selected.includes(f.id) && <Check size={14} className="text-[#1DB954]" />}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating…' : 'Create Group'}
        </button>
      </div>
    </div>
  )
}

// ── Public Group Card ─────────────────────────────────────────────────────────

function PublicGroupCard({ group, onJoined }) {
  const [joining, setJoining] = useState(false)
  const [joined, setJoined]   = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    setJoining(true)
    try {
      await joinPublicGroup(group.id)
      setJoined(true)
      onJoined?.(group)
    } catch (_) {}
    setJoining(false)
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center flex-shrink-0">
        <Users size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-white font-semibold text-sm truncate">{group.name}</p>
          <Globe size={10} className="text-[#1DB954] flex-shrink-0" />
        </div>
        {group.description && (
          <p className="text-[#B3B3B3] text-xs truncate mb-0.5">{group.description}</p>
        )}
        <p className="text-[#6a6a6a] text-[10px]">{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
      </div>
      {joined ? (
        <Link
          to={`/groups/${group.id}`}
          className="flex items-center gap-1.5 bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
        >
          View
        </Link>
      ) : (
        <button
          onClick={handleJoin}
          disabled={joining}
          className="flex items-center gap-1.5 bg-[#1DB954] text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <UserPlus size={12} />
          {joining ? '…' : 'Join'}
        </button>
      )}
    </div>
  )
}

// ── Discover Section ──────────────────────────────────────────────────────────

function DiscoverGroups({ onJoined }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const timer                 = useRef(null)

  function search(q) {
    setLoading(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      searchPublicGroups(q)
        .then(({ data }) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, q ? 300 : 0)
  }

  useEffect(() => { search('') }, [])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    search(val)
  }

  function handleJoined(group) {
    setResults(prev => prev.filter(g => g.id !== group.id))
    onJoined?.()
  }

  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">Discover Public Groups</p>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6a6a6a]" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="Search public groups…"
          className="w-full bg-[#1a1a1a] text-white text-sm pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-[#6a6a6a]"
        />
      </div>

      {loading && <p className="text-[#6a6a6a] text-xs py-4">Searching…</p>}
      {!loading && results.length === 0 && (
        <p className="text-[#6a6a6a] text-xs py-4">
          {query ? 'No public groups match your search.' : 'No public groups to join yet.'}
        </p>
      )}
      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map(g => (
            <PublicGroupCard key={g.id} group={g} onJoined={() => handleJoined(g)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── My Group Card ─────────────────────────────────────────────────────────────

function GroupCard({ group }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-xl hover:bg-[#222] transition-colors group"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center flex-shrink-0 shadow-lg">
        <Users size={24} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-white font-semibold text-base truncate">{group.name}</p>
          {group.isPublic && <Globe size={11} className="text-[#1DB954] flex-shrink-0" />}
        </div>
        {group.description && (
          <p className="text-[#B3B3B3] text-xs truncate mb-0.5">{group.description}</p>
        )}
        <p className="text-[#B3B3B3] text-xs">
          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''} · {group.recCount} song{group.recCount !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight size={18} className="text-[#B3B3B3] group-hover:text-white transition-colors flex-shrink-0" />
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Groups() {
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showCreate, setCreate] = useState(false)

  function loadGroups() {
    getGroups()
      .then(({ data }) => setGroups(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadGroups() }, [])

  function handleCreated(newGroup) {
    setGroups(prev => [{ ...newGroup, memberCount: newGroup.members.length, recCount: 0 }, ...prev])
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 via-[#121212]/60 to-transparent pointer-events-none" />
        <TopBar transparent />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        {/* Page heading */}
        <div className="flex items-end gap-6 mb-8 mt-2">
          <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center shadow-xl shadow-purple-900/40 flex-shrink-0">
            <Users size={40} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[#B3B3B3] text-xs font-bold uppercase tracking-widest mb-1">Social</p>
            <h1 className="text-white font-black text-3xl mb-2">Groups</h1>
            <p className="text-[#B3B3B3] text-sm">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setCreate(true)}
            className="flex items-center gap-2 bg-[#1DB954] text-black font-bold px-5 py-2.5 rounded-full hover:bg-[#1ed760] transition-colors"
          >
            <Plus size={16} />
            New Group
          </button>
        </div>

        {/* Discover public groups */}
        <DiscoverGroups onJoined={loadGroups} />

        {/* My groups */}
        <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">My Groups</p>
        {loading && <p className="text-[#B3B3B3] text-sm">Loading…</p>}
        {!loading && groups.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <Users size={36} className="text-[#B3B3B3]" />
            </div>
            <p className="text-white font-semibold text-lg mb-1">No groups yet</p>
            <p className="text-[#B3B3B3] text-sm mb-6">Create a group to share songs with multiple friends at once.</p>
            <button
              onClick={() => setCreate(true)}
              className="bg-white text-black font-bold px-6 py-2.5 rounded-full hover:scale-105 transition-transform"
            >
              Create your first group
            </button>
          </div>
        )}
        {!loading && groups.length > 0 && (
          <div className="space-y-2 max-w-2xl">
            {groups.map(g => <GroupCard key={g.id} group={g} />)}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}

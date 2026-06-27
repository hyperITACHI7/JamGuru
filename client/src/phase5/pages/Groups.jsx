import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, X, Check, ChevronRight } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { getGroups, createGroup } from '../api/groups'
import { getFriends } from '../../phase3/api/friends'

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName]         = useState('')
  const [friends, setFriends]   = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

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
      const { data } = await createGroup({ name: name.trim(), memberIds: selected })
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
      <div className="bg-[#282828] rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
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
          className="w-full bg-[#3e3e3e] text-white text-sm rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-[#6a6a6a]"
        />

        {!loading && friends.length > 0 && (
          <>
            <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-2">
              Add Friends (optional)
            </p>
            <div className="space-y-1 max-h-44 overflow-y-auto mb-4">
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

// ── Group Card ────────────────────────────────────────────────────────────────

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
        <p className="text-white font-semibold text-base truncate">{group.name}</p>
        <p className="text-[#B3B3B3] text-xs mt-0.5">
          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''} · {group.recCount} song{group.recCount !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight size={18} className="text-[#B3B3B3] group-hover:text-white transition-colors" />
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Groups() {
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setCreate]   = useState(false)

  useEffect(() => {
    getGroups()
      .then(({ data }) => setGroups(data))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(newGroup) {
    setGroups(prev => [{ ...newGroup, memberCount: newGroup.members.length, recCount: 0 }, ...prev])
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Gradient header */}
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

        {/* Groups list */}
        {loading && <p className="text-[#B3B3B3] text-sm">Loading…</p>}
        {!loading && groups.length === 0 && (
          <div className="text-center py-16">
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

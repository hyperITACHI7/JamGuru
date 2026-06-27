import { useState, useEffect } from 'react'
import { Users, UserPlus, UserCheck, Check, Search, X } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from '../api/friends'

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, size = 10 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center text-black font-bold flex-shrink-0`}
      style={{ minWidth: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function StatusBadge({ status, isRequester }) {
  if (status === 'ACCEPTED') {
    return (
      <span className="flex items-center gap-1 text-[#1DB954] text-xs font-semibold">
        <UserCheck size={13} /> Friends
      </span>
    )
  }
  if (status === 'PENDING' && isRequester) {
    return <span className="text-[#B3B3B3] text-xs">Requested</span>
  }
  return null
}

function UserSearchCard({ user, onAdd }) {
  const [busy, setBusy] = useState(false)
  const [localStatus, setLocalStatus] = useState(user.friendshipStatus)

  async function handleAdd() {
    setBusy(true)
    try {
      await onAdd(user.id)
      setLocalStatus('PENDING')
    } catch (e) {
      if (e.response?.data?.error === 'Already friends') setLocalStatus('ACCEPTED')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] rounded-xl">
      <Avatar name={user.displayName} size={10} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{user.displayName}</p>
        <p className="text-[#B3B3B3] text-xs truncate">@{user.username}</p>
      </div>
      {localStatus === 'ACCEPTED' ? (
        <StatusBadge status="ACCEPTED" />
      ) : localStatus === 'PENDING' ? (
        <span className="text-[#B3B3B3] text-xs whitespace-nowrap">Requested</span>
      ) : (
        <button
          onClick={handleAdd}
          disabled={busy}
          className="flex items-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#e6e6e6] transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <UserPlus size={12} />
          Add
        </button>
      )}
    </div>
  )
}

function RequestCard({ req, onAccept }) {
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)

  async function handle() {
    setBusy(true)
    try {
      await onAccept(req.requester.id)
      setAccepted(true)
    } finally {
      setBusy(false)
    }
  }

  if (accepted) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1DB954]/10 rounded-xl border border-[#1DB954]/20">
        <Avatar name={req.requester.displayName} size={10} />
        <p className="flex-1 text-white text-sm font-medium">{req.requester.displayName}</p>
        <Check size={16} className="text-[#1DB954]" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] rounded-xl">
      <Avatar name={req.requester.displayName} size={10} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{req.requester.displayName}</p>
        <p className="text-[#B3B3B3] text-xs">@{req.requester.username}</p>
      </div>
      <button
        onClick={handle}
        disabled={busy}
        className="bg-[#1DB954] text-black text-xs font-bold px-4 py-1.5 rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        Accept
      </button>
    </div>
  )
}

function FriendCard({ friend, onRemove }) {
  const [busy, setBusy] = useState(false)

  async function handleRemove() {
    setBusy(true)
    try {
      await onRemove(friend.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] rounded-xl group">
      <Avatar name={friend.displayName} size={10} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{friend.displayName}</p>
        <p className="text-[#B3B3B3] text-xs truncate">@{friend.username}</p>
      </div>
      <button
        onClick={handleRemove}
        disabled={busy}
        title="Unfriend"
        className="opacity-0 group-hover:opacity-100 text-[#B3B3B3] hover:text-red-400 transition-all p-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Main Friends page ─────────────────────────────────────────────────────────

export default function Friends() {
  const [query, setQuery]           = useState('')
  const [searchResults, setResults] = useState([])
  const [friends, setFriends]       = useState([])
  const [requests, setRequests]     = useState([])
  const [searching, setSearching]   = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([getFriends(), getFriendRequests()])
      .then(([fr, rq]) => {
        setFriends(fr.data)
        setRequests(rq.data)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try { const { data } = await searchUsers(query.trim()); setResults(data) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function handleAdd(userId) {
    await sendFriendRequest(userId)
    // Refresh requests list in case of auto-accept
    const rq = await getFriendRequests()
    setRequests(rq.data)
  }

  async function handleAccept(requesterId) {
    await acceptFriendRequest(requesterId)
    const [fr, rq] = await Promise.all([getFriends(), getFriendRequests()])
    setFriends(fr.data)
    setRequests(rq.data)
  }

  async function handleRemove(userId) {
    await removeFriend(userId)
    setFriends(prev => prev.filter(f => f.id !== userId))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Gradient header */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 via-[#121212]/60 to-transparent pointer-events-none" />
        <TopBar transparent />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        {/* Page heading */}
        <div className="flex items-end gap-6 mb-8 mt-2">
          <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-900/40 flex-shrink-0">
            <Users size={40} className="text-white" />
          </div>
          <div>
            <p className="text-[#B3B3B3] text-xs font-bold uppercase tracking-widest mb-1">Social</p>
            <h1 className="text-white font-black text-3xl mb-2">Friends</h1>
            <p className="text-[#B3B3B3] text-sm">
              {friends.length} friend{friends.length !== 1 ? 's' : ''} · {requests.length} pending
            </p>
          </div>
        </div>

        {/* Search */}
        <section className="mb-8">
          <h2 className="text-white font-bold text-lg mb-3">Find Friends</h2>
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by username…"
              className="w-full bg-[#282828] text-white text-sm py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-[#6a6a6a]"
            />
          </div>
          <div className="mt-3 space-y-2 max-w-sm">
            {searching && <p className="text-[#B3B3B3] text-sm ml-1">Searching…</p>}
            {!searching && searchResults.map(u => (
              <UserSearchCard key={u.id} user={u} onAdd={handleAdd} />
            ))}
            {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-[#B3B3B3] text-sm ml-1">No users found for "{query}"</p>
            )}
          </div>
        </section>

        {/* Pending requests */}
        {requests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-white font-bold text-lg mb-3">
              Pending Requests{' '}
              <span className="text-[#1DB954] font-semibold text-base">{requests.length}</span>
            </h2>
            <div className="space-y-2 max-w-sm">
              {requests.map(r => (
                <RequestCard key={r.id} req={r} onAccept={handleAccept} />
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="text-white font-bold text-lg mb-3">
            Your Friends{' '}
            <span className="text-[#B3B3B3] font-normal text-base">{friends.length}</span>
          </h2>
          {loading && <p className="text-[#B3B3B3] text-sm">Loading…</p>}
          {!loading && friends.length === 0 && (
            <p className="text-[#B3B3B3] text-sm">
              No friends yet — search by username above to add someone.
            </p>
          )}
          {!loading && friends.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
              {friends.map(f => (
                <FriendCard key={f.id} friend={f} onRemove={handleRemove} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

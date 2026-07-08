import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Users, UserPlus, Plus, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getFriends, getInboxSummary } from '../phase3/api/friends'
import { getGroups } from '../phase5/api/groups'
import { getTrustRankings } from '../phase4/api/jamguru'

export default function FriendsDmPanel({ selected, onSelect, className = '' }) {
  const [tab, setTab]         = useState('friends')
  const [friends, setFriends] = useState([])
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState('latest')
  const [query, setQuery]     = useState('')
  const [trustMap, setTrustMap] = useState({})
  // summary: { friends: { [friendId]: { newSongsCount, openRequestCount, lastActivityAt } }, groups: { [groupId]: {...} } }
  const [summary, setSummary] = useState({ friends: {}, groups: {} })

  const fetchSummary = useCallback(() => {
    getInboxSummary()
      .then(({ data }) => {
        const friends = {}
        const groups  = {}
        for (const f of data.friends ?? []) friends[f.friendId] = f
        for (const g of data.groups  ?? []) groups[g.groupId]   = g
        setSummary({ friends, groups })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([getFriends(), getGroups()])
      .then(([fr, gr]) => {
        setFriends(fr.data ?? [])
        setGroups(gr.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    fetchSummary()
    getTrustRankings()
      .then(({ data }) => {
        const map = {}
        for (const r of data) map[r.friend.id] = r.trustScore
        setTrustMap(map)
      })
      .catch(() => {})
  }, [fetchSummary])

  // Re-fetch summary on any like/dismiss action or SSE event
  useEffect(() => {
    const handler = () => fetchSummary()
    window.addEventListener('jam:like', handler)
    window.addEventListener('jam:sse', handler)
    return () => {
      window.removeEventListener('jam:like', handler)
      window.removeEventListener('jam:sse', handler)
    }
  }, [fetchSummary])

  function switchTab(next) {
    setTab(next)
    setQuery('')
    if (selected && selected.type !== next.replace('friends', 'friend').replace('groups', 'group')) {
      onSelect(null)
    }
  }

  const isFriendSelected = (f) => selected?.type === 'friend' && selected?.data?.id === f.id
  const isGroupSelected  = (g) => selected?.type === 'group'  && selected?.data?.id === g.id

  function friendSubtitle(f) {
    const s = summary.friends[f.id]
    if (s?.openRequestCount > 0) return { text: 'Requested a song', unseen: true }
    if (s?.newSongsCount    > 0) return {
      text: `Sent ${s.newSongsCount} new song${s.newSongsCount > 1 ? 's' : ''}`,
      unseen: true,
    }
    return { text: 'No new messages', unseen: false, muted: true }
  }

  function groupSubtitle(g) {
    const s = summary.groups[g.id]
    const songs = s?.newSongsCount    ?? 0
    const reqs  = s?.openRequestCount ?? 0
    if (songs === 0 && reqs === 0) {
      return { text: `${g.memberCount ?? g._count?.members ?? 0} members`, unseen: false, muted: true }
    }
    const parts = []
    if (songs > 0) parts.push(`${songs} song recommendation${songs > 1 ? 's' : ''}`)
    if (reqs  > 0) parts.push(`${reqs} request${reqs > 1 ? 's' : ''}`)
    return { text: parts.join(' · '), unseen: true }
  }

  const friendActivityTime = (f) => {
    const t = summary.friends[f.id]?.lastActivityAt
    return t ? new Date(t).getTime() : -Infinity
  }
  const groupActivityTime = (g) => {
    const t = summary.groups[g.id]?.lastActivityAt
    return t ? new Date(t).getTime() : -Infinity
  }

  const matchesQuery = (name) => name?.toLowerCase().includes(query.trim().toLowerCase())

  const sortedFriends = sort === 'score'
    ? [...friends].sort((a, b) => (trustMap[b.id] ?? 0) - (trustMap[a.id] ?? 0))
    : [...friends].sort((a, b) => friendActivityTime(b) - friendActivityTime(a))
  const visibleFriends = sortedFriends.filter(f => matchesQuery(f.displayName))

  const sortedGroups  = [...groups].sort((a, b) => groupActivityTime(b) - groupActivityTime(a))
  const visibleGroups = sortedGroups.filter(g => matchesQuery(g.name))

  function renderFriendRow(f) {
    const active = isFriendSelected(f)
    const sub    = friendSubtitle(f)
    return (
      <button
        key={f.id}
        onClick={() => onSelect(active ? null : { type: 'friend', data: f })}
        style={{ height: '4.75rem' }}
        className={`w-full flex items-center gap-3.5 px-3.5 transition-colors text-left ${
          active ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 transition-colors ${
          active ? 'bg-gradient-to-br from-[#1DB954] to-emerald-700 text-black' : 'bg-[#535353] text-white'
        }`}>
          {f.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-[#B3B3B3]'}`}>
            {f.displayName}
          </p>
          <p className={`text-xs truncate ${
            sub.unseen ? 'glow-green text-[#1DB954] font-bold' : sub.muted ? 'text-[#535353]' : 'text-[#B3B3B3]'
          }`}>
            {sub.text}
          </p>
        </div>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954] flex-shrink-0" />}
      </button>
    )
  }

  function renderGroupRow(g) {
    const active = isGroupSelected(g)
    const sub    = groupSubtitle(g)
    return (
      <button
        key={g.id}
        onClick={() => onSelect(active ? null : { type: 'group', data: g })}
        style={{ height: '4.75rem' }}
        className={`w-full flex items-center gap-3.5 px-3.5 transition-colors text-left ${
          active ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
      >
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          active ? 'bg-gradient-to-br from-purple-500 to-violet-700' : 'bg-gradient-to-br from-purple-700 to-violet-900'
        }`}>
          <Users size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-[#B3B3B3]'}`}>
            {g.name}
          </p>
          <p className={`text-xs truncate ${
            sub.unseen ? 'glow-green text-[#1DB954] font-bold' : sub.muted ? 'text-[#535353]' : 'text-[#B3B3B3]'
          }`}>
            {sub.text}
          </p>
        </div>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
      </button>
    )
  }

  return (
    <div className={`w-[240px] flex-shrink-0 min-h-0 border-l border-white/10 shadow-[-6px_0_16px_-10px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden ${className}`}>

      {/* Tab switcher */}
      <div className="px-3 pt-3 pb-0 flex-shrink-0">
        <div className="flex bg-[#1a1a1a] rounded-full p-0.5">
          <button
            onClick={() => switchTab('friends')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              tab === 'friends' ? 'bg-white text-black' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <MessageCircle size={11} />
            Friends
          </button>
          <button
            onClick={() => switchTab('groups')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              tab === 'groups' ? 'bg-white text-black' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <Users size={11} />
            Groups
          </button>
        </div>
      </div>

      {/* Sort toggle — friends tab only. Labeled and set apart from the tab switcher above so it
          reads as a sub-control of "Friends", not a sibling of the Friends/Groups switch. */}
      {tab === 'friends' && friends.length > 0 && (
        <div className="px-3 pt-4 pb-2 flex-shrink-0 border-b border-white/5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#535353] mb-1.5 px-0.5">
            Sort friends by
          </p>
          <div className="flex bg-[#1a1a1a] rounded-full p-0.5">
            {[['latest', 'Latest'], ['score', 'By Score']].map(([val, label]) => (
              <button key={val} onClick={() => setSort(val)}
                className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  sort === val ? 'bg-white text-black' : 'text-[#B3B3B3] hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List — the Add Friend / Join Group CTA lives as the last item, after all rows */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(7 * 4.75rem)' }}>
        {loading ? (
          <div className="flex justify-center pt-8">
            <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'friends' ? (
          <div className={friends.length > 0 ? 'py-1' : ''}>
            {friends.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <MessageCircle size={28} className="text-[#535353] mx-auto mb-2" />
                <p className="text-[#B3B3B3] text-xs">No friends yet</p>
              </div>
            ) : visibleFriends.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Search size={24} className="text-[#535353] mx-auto mb-2" />
                <p className="text-[#B3B3B3] text-xs">No friends match "{query}"</p>
              </div>
            ) : (
              visibleFriends.map(renderFriendRow)
            )}
            <Link
              to="/friends"
              className="mx-3.5 my-3 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/20 text-[#B3B3B3] hover:text-white hover:border-white/40 text-xs font-semibold transition-colors"
            >
              <UserPlus size={12} />
              Add Friend
            </Link>
          </div>
        ) : (
          <div className={groups.length > 0 ? 'py-1' : ''}>
            {groups.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Users size={28} className="text-[#535353] mx-auto mb-2" />
                <p className="text-[#B3B3B3] text-xs">No groups yet</p>
              </div>
            ) : visibleGroups.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Search size={24} className="text-[#535353] mx-auto mb-2" />
                <p className="text-[#B3B3B3] text-xs">No groups match "{query}"</p>
              </div>
            ) : (
              visibleGroups.map(renderGroupRow)
            )}
            <Link
              to="/groups"
              className="mx-3.5 my-3 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/20 text-[#B3B3B3] hover:text-white hover:border-white/40 text-xs font-semibold transition-colors"
            >
              <Plus size={12} />
              Join / Create Group
            </Link>
          </div>
        )}
      </div>

      {/* Search — floating pill, no wrapper bar/background/border of its own, pinned to the
          bottom of the panel (last flex item) so it's always visible without scrolling. */}
      <div className="flex-shrink-0 px-2.5 py-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#535353] pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'friends' ? 'Search friends' : 'Search groups'}
            className="w-full bg-[#1a1a1a] text-white text-xs rounded-full pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1DB954]/50 placeholder-[#535353]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#535353] hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

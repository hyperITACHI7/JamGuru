import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Users, UserPlus, Plus } from 'lucide-react'
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
  const [trustMap, setTrustMap] = useState({})
  // summary: { friends: { [friendId]: { newSongsCount, openRequestCount } }, groups: { [groupId]: {...} } }
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
    if (selected && selected.type !== next.replace('friends', 'friend').replace('groups', 'group')) {
      onSelect(null)
    }
  }

  const isFriendSelected = (f) => selected?.type === 'friend' && selected?.data?.id === f.id
  const isGroupSelected  = (g) => selected?.type === 'group'  && selected?.data?.id === g.id

  function friendSubtitle(f) {
    const s = summary.friends[f.id]
    if (s?.openRequestCount > 0) return { text: 'Requested a song', green: true }
    if (s?.newSongsCount    > 0) return {
      text: `Sent ${s.newSongsCount} new song${s.newSongsCount > 1 ? 's' : ''}`,
      green: false,
    }
    return { text: `@${f.username}`, green: false, muted: true }
  }

  function groupSubtitle(g) {
    const s = summary.groups[g.id]
    const songs = s?.newSongsCount    ?? 0
    const reqs  = s?.openRequestCount ?? 0
    if (songs === 0 && reqs === 0) {
      return { text: `${g.memberCount ?? g._count?.members ?? 0} members`, green: false, muted: true }
    }
    const parts = []
    if (songs > 0) parts.push(`${songs} song recommendation${songs > 1 ? 's' : ''}`)
    if (reqs  > 0) parts.push(`${reqs} request${reqs > 1 ? 's' : ''}`)
    return { text: parts.join(' · '), green: reqs > 0 }
  }

  const sortedFriends = sort === 'score'
    ? [...friends].sort((a, b) => (trustMap[b.id] ?? 0) - (trustMap[a.id] ?? 0))
    : [...friends].sort((a, b) => {
        const aAct = (summary.friends[a.id]?.newSongsCount ?? 0) + (summary.friends[a.id]?.openRequestCount ?? 0)
        const bAct = (summary.friends[b.id]?.newSongsCount ?? 0) + (summary.friends[b.id]?.openRequestCount ?? 0)
        return bAct - aAct
      })

  return (
    <div className={`w-[240px] flex-shrink-0 border-l border-white/5 flex flex-col overflow-hidden ${className}`}>

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

      {/* CTA row */}
      <div className="px-3 py-2 flex-shrink-0 border-b border-white/5">
        {tab === 'friends' ? (
          <Link
            to="/friends"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/20 text-[#B3B3B3] hover:text-white hover:border-white/40 text-xs font-semibold transition-colors"
          >
            <UserPlus size={12} />
            Add Friend
          </Link>
        ) : (
          <Link
            to="/groups"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/20 text-[#B3B3B3] hover:text-white hover:border-white/40 text-xs font-semibold transition-colors"
          >
            <Plus size={12} />
            Join / Create Group
          </Link>
        )}
      </div>

      {/* Sort toggle — friends tab only */}
      {tab === 'friends' && friends.length > 0 && (
        <div className="px-3 py-2 flex-shrink-0 border-b border-white/5">
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

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center pt-8">
            <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageCircle size={28} className="text-[#535353] mx-auto mb-2" />
              <p className="text-[#B3B3B3] text-xs mb-3">No friends yet</p>
              <Link to="/friends" className="text-[#1DB954] text-xs font-semibold hover:underline">
                Find friends →
              </Link>
            </div>
          ) : (
            <div className="py-1">
              {sortedFriends.map(f => {
                const active = isFriendSelected(f)
                const sub    = friendSubtitle(f)
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelect(active ? null : { type: 'friend', data: f })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                      active ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                      active ? 'bg-gradient-to-br from-[#1DB954] to-emerald-700 text-black' : 'bg-[#535353] text-white'
                    }`}>
                      {f.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-[#B3B3B3]'}`}>
                        {f.displayName}
                      </p>
                      <p className={`text-xs truncate ${
                        sub.green ? 'text-[#1DB954] font-semibold' : sub.muted ? 'text-[#535353]' : 'text-[#B3B3B3]'
                      }`}>
                        {sub.text}
                      </p>
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954] flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )
        ) : (
          groups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Users size={28} className="text-[#535353] mx-auto mb-2" />
              <p className="text-[#B3B3B3] text-xs mb-3">No groups yet</p>
              <Link to="/groups" className="text-[#1DB954] text-xs font-semibold hover:underline">
                Create one →
              </Link>
            </div>
          ) : (
            <div className="py-1">
              {groups.map(g => {
                const active = isGroupSelected(g)
                const sub    = groupSubtitle(g)
                return (
                  <button
                    key={g.id}
                    onClick={() => onSelect(active ? null : { type: 'group', data: g })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                      active ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? 'bg-gradient-to-br from-purple-500 to-violet-700' : 'bg-gradient-to-br from-purple-700 to-violet-900'
                    }`}>
                      <Users size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-[#B3B3B3]'}`}>
                        {g.name}
                      </p>
                      <p className={`text-xs truncate ${
                        sub.green ? 'text-[#1DB954] font-semibold' : sub.muted ? 'text-[#535353]' : 'text-[#B3B3B3]'
                      }`}>
                        {sub.text}
                      </p>
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}

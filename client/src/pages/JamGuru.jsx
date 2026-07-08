import { useState, useEffect, useCallback } from 'react'
import { Crown, UserPlus, RefreshCw, MessageCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'
import RecommendationCard from '../phase3/components/RecommendationCard'
import JamGuruCard from '../phase4/components/JamGuruCard'
import FriendsDmPanel from './FriendsDmPanel'
import ConversationView from './ConversationView'
import GroupConversationView from './GroupConversationView'
import { getInbox } from '../phase3/api/recommendations'
import { getJamGuruCount } from '../phase4/api/jamguru'

function groupByTime(recs) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dow = today.getDay()
  const startOfThisWeek = new Date(today.getTime() - (dow === 0 ? 6 : dow - 1) * 86400000)
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400000)

  const buckets = [
    { label: 'Today',     recs: [] },
    { label: 'Yesterday', recs: [] },
    { label: 'This Week', recs: [] },
    { label: 'Last Week', recs: [] },
    { label: 'Earlier',   recs: [] },
  ]

  for (const rec of recs) {
    const d   = new Date(rec.sentAt)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const t   = day.getTime()
    if (t === today.getTime())         buckets[0].recs.push(rec)
    else if (t === yesterday.getTime()) buckets[1].recs.push(rec)
    else if (day >= startOfThisWeek)   buckets[2].recs.push(rec)
    else if (day >= startOfLastWeek)   buckets[3].recs.push(rec)
    else                               buckets[4].recs.push(rec)
  }

  return buckets
    .filter(b => b.recs.length > 0)
    .map(b => ({
      ...b,
      recs: [...b.recs.filter(r => !r.disliked), ...b.recs.filter(r => r.disliked)],
    }))
}

export default function JamGuru() {
  const [inbox, setInbox]                     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [showMobileMessages, setShowMobileMessages] = useState(false)
  const [refreshing, setRefreshing]           = useState(false)
  const [error, setError]                     = useState(null)
  const [jamGuruForCount, setJamGuruForCount] = useState(0)
  // selectedEntity: null | { type: 'friend'|'group', data: {...} }
  const [selectedEntity, setSelectedEntity]   = useState(null)

  const fetchJamGuruCount = useCallback(() => {
    getJamGuruCount()
      .then(({ data }) => setJamGuruForCount(data.count))
      .catch(() => {})
  }, [])

  const fetchInbox = useCallback((isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); fetchJamGuruCount() }
    else setLoading(true)
    setError(null)
    getInbox('score')
      .then(({ data }) => setInbox(data))
      .catch(() => setError('Could not load inbox'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [fetchJamGuruCount])

  useEffect(() => {
    fetchJamGuruCount()
    fetchInbox()
  }, [fetchInbox, fetchJamGuruCount])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Gradient header — always visible on desktop; hidden on mobile when inside a DM/group chat */}
      <div className={`relative flex-shrink-0 ${selectedEntity ? 'hidden md:block' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/70 via-[#121212]/60 to-transparent pointer-events-none" />
        <TopBar
          transparent
          rightExtra={
            <button
              className="md:hidden w-9 h-9 rounded-full bg-[#282828] hover:bg-[#3e3e3e] flex items-center justify-center transition-colors"
              onClick={() => setShowMobileMessages(true)}
              title="Messages"
            >
              <MessageCircle size={18} className="text-white" />
            </button>
          }
        />
      </div>

      {/* Mobile messages — full screen takeover */}
      {showMobileMessages && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#121212] flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
            <button onClick={() => setShowMobileMessages(false)} className="text-[#B3B3B3] hover:text-white transition-colors">
              <X size={22} />
            </button>
            <span className="text-white font-bold text-base">Messages</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <FriendsDmPanel
              selected={selectedEntity}
              onSelect={(e) => { setSelectedEntity(e); setShowMobileMessages(false) }}
              className="!w-full border-l-0 shadow-none"
            />
          </div>
        </div>
      )}

      {/* 2-column body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Middle — inbox feed or conversation */}
        <div className="flex-1 overflow-hidden">
          {selectedEntity?.type === 'friend' ? (
            <ConversationView
              friend={selectedEntity.data}
              onBack={() => { setSelectedEntity(null); setShowMobileMessages(true) }}
            />
          ) : selectedEntity?.type === 'group' ? (
            <GroupConversationView
              group={selectedEntity.data}
              onBack={() => { setSelectedEntity(null); setShowMobileMessages(true) }}
            />
          ) : (
            <div className="h-full overflow-y-auto px-6 pb-8">

              {/* Page heading */}
              <div className="mb-8 mt-4">
                <p className="text-[#B3B3B3] text-xs font-bold uppercase tracking-widest mb-1">Feature</p>
                <h1 className="text-white font-black text-3xl mb-4">Discovery Inbox</h1>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center shadow-xl shadow-green-900/40 flex-shrink-0">
                    <Crown size={40} className="text-black fill-black" />
                  </div>
                  <div>
                    <p className="text-[#B3B3B3] text-sm">
                      Share songs with friends. Get credit when they love it.{' '}
                      <span className="text-[#1DB954] font-medium">Become their JamGuru.</span>
                    </p>
                    <p className="text-[#B3B3B3] text-sm mt-1">
                      JamGuru for{' '}
                      <span className="text-white font-semibold">{jamGuruForCount}</span> listeners this month
                    </p>
                  </div>
                </div>
              </div>

              {/* JamGuru card */}
              <JamGuruCard />

              {/* Loading */}
              {loading && (
                <div className="text-center py-16">
                  <p className="text-[#B3B3B3] text-sm">Loading your inbox…</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-center py-16">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Empty */}
              {!loading && !error && inbox.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-[#282828] flex items-center justify-center mx-auto mb-5">
                    <Crown size={32} className="text-[#B3B3B3]" />
                  </div>
                  <h2 className="text-white font-bold text-xl mb-2">Your inbox is empty</h2>
                  <p className="text-[#B3B3B3] text-sm max-w-sm mx-auto leading-relaxed mb-6">
                    Add friends and ask them to share songs with you. Every recommendation appears here.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      to="/friends"
                      className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-full hover:scale-105 transition-transform"
                    >
                      <UserPlus size={16} />
                      Find Friends
                    </Link>
                    <button
                      onClick={() => fetchInbox(true)}
                      disabled={refreshing}
                      className="inline-flex items-center gap-2 bg-[#282828] text-white font-bold px-5 py-3 rounded-full hover:bg-[#3e3e3e] transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>
              )}

              {/* Inbox list */}
              {!loading && !error && inbox.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">
                      All Recommendations
                      <span className="text-[#B3B3B3] font-normal text-sm ml-3">
                        {inbox.length} new
                      </span>
                    </h2>
                    <button
                      onClick={() => fetchInbox(true)}
                      disabled={refreshing}
                      title="Refresh inbox"
                      className="text-[#B3B3B3] hover:text-white transition-colors disabled:opacity-40 p-1"
                    >
                      <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  {groupByTime(inbox).map(group => (
                    <div key={group.label} className="mb-6">
                      <p className="text-[#B3B3B3] text-[11px] font-bold uppercase tracking-widest mb-3">
                        {group.label}
                      </p>
                      <div className="space-y-3">
                        {group.recs.map(rec => (
                          <RecommendationCard key={rec.id} rec={rec} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — friends/groups DM panel (desktop only) */}
        <div className="hidden md:flex">
          <FriendsDmPanel selected={selectedEntity} onSelect={setSelectedEntity} />
        </div>
      </div>
    </div>
  )
}

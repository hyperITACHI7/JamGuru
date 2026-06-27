import { useState, useRef, useEffect } from 'react'
import { X, Search, UserPlus, UserCheck, Loader } from 'lucide-react'
import { searchUsers, sendFriendRequest } from '../phase3/api/friends'

export default function FindFriendsSheet({ onClose }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [statuses, setStatuses] = useState({})  // { [userId]: 'PENDING_SENT' | 'ACCEPTED' | null }
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchUsers(q)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function handleAdd(user) {
    setStatuses(prev => ({ ...prev, [user.id]: 'loading' }))
    try {
      await sendFriendRequest(user.id)
      setStatuses(prev => ({ ...prev, [user.id]: 'PENDING_SENT' }))
    } catch (e) {
      if (e.response?.data?.error === 'Already friends') {
        setStatuses(prev => ({ ...prev, [user.id]: 'ACCEPTED' }))
      } else {
        setStatuses(prev => ({ ...prev, [user.id]: null }))
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full md:w-[420px] bg-[#181818] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b border-white/5">
          <h2 className="text-white font-bold text-base">Find Friends</h2>
          <button onClick={onClose} className="text-[#B3B3B3] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-[#282828] rounded-full px-4 py-2.5">
            <Search size={15} className="text-[#535353] flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or username…"
              className="flex-1 bg-transparent text-white text-sm placeholder-[#535353] focus:outline-none"
            />
            {searching && (
              <Loader size={14} className="text-[#535353] animate-spin flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {query.trim().length < 2 && (
            <p className="text-[#535353] text-sm text-center py-10">
              Type at least 2 characters to search
            </p>
          )}

          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <p className="text-[#535353] text-sm text-center py-10">No users found</p>
          )}

          <div className="space-y-1">
            {results.map(u => {
              const status = statuses[u.id] ?? u.friendshipStatus ?? null
              return (
                <div key={u.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                    {u.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
                    <p className="text-[#535353] text-xs">@{u.username}</p>
                  </div>

                  {status === 'ACCEPTED' && (
                    <div className="flex items-center gap-1 text-[#1DB954] text-xs font-semibold flex-shrink-0">
                      <UserCheck size={14} /> Friends
                    </div>
                  )}
                  {status === 'PENDING_SENT' && (
                    <span className="text-[#535353] text-xs font-semibold flex-shrink-0">Requested</span>
                  )}
                  {status === 'PENDING_RECEIVED' && (
                    <button
                      onClick={() => handleAdd(u)}
                      className="flex items-center gap-1 bg-[#1DB954] text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#1ed760] transition-colors flex-shrink-0"
                    >
                      <UserPlus size={12} /> Accept
                    </button>
                  )}
                  {status === 'loading' && (
                    <Loader size={16} className="text-[#535353] animate-spin flex-shrink-0" />
                  )}
                  {!status && (
                    <button
                      onClick={() => handleAdd(u)}
                      className="flex items-center gap-1 bg-[#1DB954] text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#1ed760] transition-colors flex-shrink-0"
                    >
                      <UserPlus size={12} /> Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { X, Crown } from 'lucide-react'
import { getGroup } from '../phase5/api/groups'

export default function GroupMembersSheet({ group, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const me = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    getGroup(group.id)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [group.id])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full md:w-96 bg-[#181818] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[70vh]">
        {/* Handle bar on mobile */}
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-3 flex-shrink-0 border-b border-white/5">
          <div>
            <h2 className="text-white font-bold text-base leading-tight">{group.name}</h2>
            <p className="text-[#B3B3B3] text-xs mt-0.5">
              {group.memberCount ?? group._count?.members ?? members.length} members
            </p>
          </div>
          <button onClick={onClose} className="text-[#B3B3B3] hover:text-white transition-colors mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {members.map(m => {
                const user = m.user ?? m
                const isCreator = group.createdBy === user.id
                const isMe = user.id === me.id
                return (
                  <div key={user.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {user.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                        {user.displayName}
                        {isCreator && (
                          <Crown size={11} className="text-[#1DB954] fill-[#1DB954] flex-shrink-0" />
                        )}
                      </p>
                      <p className="text-[#535353] text-xs">@{user.username}</p>
                    </div>
                    {isMe && (
                      <span className="text-[#B3B3B3] text-[10px] font-semibold flex-shrink-0">You</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

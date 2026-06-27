import { useState, useEffect } from 'react'
import { X, UserPlus, UserCheck, Crown } from 'lucide-react'
import { getProfile } from '../api/users'
import { sendFriendRequest } from '../phase3/api/friends'

export default function FriendProfileSheet({ friend, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getProfile(friend.username)
      .then(({ data }) => {
        setProfile(data)
        setStatus(data.friendshipStatus)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [friend.username])

  async function handleAdd() {
    setAdding(true)
    try {
      await sendFriendRequest(profile.id)
      setStatus('PENDING_SENT')
    } catch (e) {
      if (e.response?.data?.error === 'Already friends') setStatus('ACCEPTED')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full md:w-80 bg-[#181818] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
        {/* Handle bar on mobile */}
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !profile ? (
            <p className="text-[#B3B3B3] text-sm py-6">Could not load profile.</p>
          ) : (
            <>
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center text-black font-bold text-2xl mb-3 flex-shrink-0">
                {profile.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>

              <h2 className="text-white font-bold text-xl leading-tight">{profile.displayName}</h2>
              <p className="text-[#B3B3B3] text-sm mb-1">@{profile.username}</p>
              {profile.bio && <p className="text-[#B3B3B3] text-sm mt-2 leading-relaxed">{profile.bio}</p>}

              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-white font-bold text-lg leading-tight">{profile.friendCount ?? 0}</p>
                  <p className="text-[#B3B3B3] text-xs">Friends</p>
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-tight">{profile.jamGuruForCount ?? 0}</p>
                  <p className="text-[#B3B3B3] text-xs">JamGuru for</p>
                </div>
              </div>

              {/* Their JamGuru */}
              {profile.myJamGuru && (
                <div className="mt-4 bg-[#282828] rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Crown size={14} className="text-black fill-black" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#535353] text-[10px] font-bold uppercase tracking-wider">Their JamGuru</p>
                    <p className="text-white text-sm font-semibold truncate">{profile.myJamGuru.displayName}</p>
                  </div>
                </div>
              )}

              {/* Friendship action */}
              <div className="mt-5">
                {status === 'ACCEPTED' ? (
                  <div className="w-full flex items-center justify-center gap-2 text-[#1DB954] text-sm font-semibold py-2.5 rounded-full border border-[#1DB954]/40">
                    <UserCheck size={15} /> Friends
                  </div>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={adding || status === 'PENDING_SENT'}
                    className="w-full flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-2.5 rounded-full transition-colors disabled:opacity-60"
                  >
                    {status === 'PENDING_SENT' ? (
                      <><UserCheck size={15} /> Requested</>
                    ) : (
                      <><UserPlus size={15} /> {adding ? 'Adding…' : 'Add Friend'}</>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

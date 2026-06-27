import { useState, useEffect } from 'react'
import { Crown } from 'lucide-react'
import { getMyJamGuru } from '../api/jamguru'

export default function JamGuruCard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  function fetchJamGuru() {
    getMyJamGuru()
      .then(({ data }) => setData(data))
      .catch(() => setData({ jamguru: null, discoveryCount: 0 }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchJamGuru()
    window.addEventListener('jam:like', fetchJamGuru)
    return () => window.removeEventListener('jam:like', fetchJamGuru)
  }, [])

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 mb-6 animate-pulse h-24" />
    )
  }

  if (!data?.jamguru) {
    return (
      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#282828] flex items-center justify-center flex-shrink-0">
          <Crown size={22} className="text-[#535353]" />
        </div>
        <div>
          <p className="text-[#B3B3B3] text-[10px] uppercase tracking-widest font-semibold mb-0.5">Your JamGuru</p>
          <p className="text-white font-semibold">No JamGuru yet</p>
          <p className="text-[#B3B3B3] text-xs mt-0.5">Like recommendations to find your top recommender</p>
        </div>
      </div>
    )
  }

  const { jamguru, discoveryCount } = data
  const initial = jamguru.displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="bg-gradient-to-r from-[#1DB954]/10 to-[#1a1a1a] border border-[#1DB954]/20 rounded-xl p-5 mb-6 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center text-black font-bold text-xl flex-shrink-0">
        {initial}
      </div>
      <div>
        <p className="text-[#B3B3B3] text-[10px] uppercase tracking-widest font-semibold mb-0.5 flex items-center gap-1">
          <Crown size={10} className="text-[#1DB954]" />Your JamGuru
        </p>
        <p className="text-white font-bold text-lg leading-tight">{jamguru.displayName}</p>
        <p className="text-[#B3B3B3] text-xs mt-0.5">
          {discoveryCount} discovery{discoveryCount !== 1 ? 'ies' : ''} you loved this month
        </p>
      </div>
    </div>
  )
}

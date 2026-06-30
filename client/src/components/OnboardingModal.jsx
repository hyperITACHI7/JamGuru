import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2, Heart, Crown, Check, Search, UserPlus, UserCheck, Loader } from 'lucide-react'
import { searchUsers, sendFriendRequest } from '../phase3/api/friends'
import { updateTaste } from '../api/taste'
import { completeOnboarding } from '../api/auth'

const GENRE_OPTIONS = [
  'hip-hop', 'r&b', 'pop', 'rock', 'indie', 'electronic',
  'jazz', 'classical', 'metal', 'latin', 'soul', 'folk', 'reggae', 'country',
]
const MOOD_OPTIONS = [
  'chill', 'party', 'late night', 'workout', 'focus', 'road trip',
  'heartbreak', 'happy', 'nostalgic', 'romantic',
]
const TOTAL_STEPS = 5

function ProgressDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < step ? 'w-2 h-2 bg-[#1DB954]' : 'w-1.5 h-1.5 bg-white/20'
          }`}
        />
      ))}
    </div>
  )
}

function ChipToggle({ options, selected, onChange }) {
  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            selected.includes(opt)
              ? 'bg-[#1DB954]/20 border-[#1DB954]/50 text-[#1DB954]'
              : 'border-[#535353] text-[#B3B3B3] hover:border-white hover:text-white'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Step 1: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  const displayName = (() => {
    try { return JSON.parse(localStorage.getItem('user') ?? '{}').displayName } catch { return null }
  })()

  return (
    <div className="flex flex-col items-center text-center px-6 py-8 gap-6">
      <svg viewBox="0 0 24 24" className="w-14 h-14 fill-[#1DB954]">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>

      <div className="space-y-2">
        <h1 className="text-white text-2xl font-bold leading-tight">
          Welcome to JamGuru{displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="text-[#B3B3B3] text-sm leading-relaxed">
          Your friends share songs with you. You react. The best recommender earns the JamGuru crown.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors text-sm"
      >
        Let's go
      </button>
    </div>
  )
}

// ── Step 2: How It Works ─────────────────────────────────────────────────────
function StepHowItWorks({ onNext }) {
  const rows = [
    { icon: Share2, label: 'Friends send you songs with context', sub: "A quick note about why they think you'll love it" },
    { icon: Heart,  label: "Like what lands, pass on what doesn't", sub: 'Your reactions shape your taste profile over time' },
    { icon: Crown,  label: 'Top recommender earns the JamGuru title', sub: 'The friend who knows your taste best, recognised monthly' },
  ]

  return (
    <div className="flex flex-col px-6 py-6 gap-6">
      <h2 className="text-white text-xl font-bold text-center">How it works</h2>

      <div className="space-y-5">
        {rows.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/15 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-[#1DB954]" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{label}</p>
              <p className="text-[#535353] text-xs mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors text-sm mt-2"
      >
        Got it
      </button>
    </div>
  )
}

// ── Step 3: Add a Friend ─────────────────────────────────────────────────────
function StepAddFriend({ onNext, onSkip }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [statuses, setStatuses] = useState({})
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchUsers(q)
        setResults(data)
      } catch { setResults([]) }
      finally { setSearching(false) }
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
    <div className="flex flex-col px-6 py-6 gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Find your first friend</h2>
          <p className="text-[#535353] text-xs mt-1">JamGuru is better with friends — add someone to start exchanging recs.</p>
        </div>
        <button onClick={onSkip} className="text-[#535353] text-xs hover:text-white transition-colors flex-shrink-0 ml-3 mt-1">
          Skip
        </button>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 bg-[#282828] rounded-full px-4 py-2.5">
        <Search size={14} className="text-[#535353] flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or username…"
          className="flex-1 bg-transparent text-white text-sm placeholder-[#535353] focus:outline-none"
        />
        {searching && <Loader size={13} className="text-[#535353] animate-spin flex-shrink-0" />}
      </div>

      {/* Results */}
      <div className="min-h-[120px] max-h-[180px] overflow-y-auto -mx-1">
        {query.trim().length < 2 && (
          <p className="text-[#535353] text-xs text-center py-8">Type at least 2 characters to search</p>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-[#535353] text-xs text-center py-8">No users found</p>
        )}
        <div className="space-y-0.5">
          {results.map(u => {
            const status = statuses[u.id] ?? u.friendshipStatus ?? null
            return (
              <div key={u.id} className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {u.displayName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
                  <p className="text-[#535353] text-xs">@{u.username}</p>
                </div>
                {status === 'ACCEPTED' && (
                  <div className="flex items-center gap-1 text-[#1DB954] text-xs font-semibold flex-shrink-0">
                    <UserCheck size={13} /> Friends
                  </div>
                )}
                {status === 'PENDING_SENT' && (
                  <span className="text-[#535353] text-xs font-semibold flex-shrink-0">Requested</span>
                )}
                {status === 'loading' && (
                  <Loader size={14} className="text-[#535353] animate-spin flex-shrink-0" />
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

      <button
        onClick={onNext}
        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors text-sm"
      >
        Continue
      </button>
    </div>
  )
}

// ── Step 4: Taste Profile ────────────────────────────────────────────────────
function StepTaste({ onNext, onSkip }) {
  const [genres, setGenres] = useState([])
  const [moods, setMoods]   = useState([])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (genres.length === 0 && moods.length === 0) { onNext(); return }
    setSaving(true)
    try { await updateTaste({ genres, moods }) } catch { /* continue */ }
    finally { setSaving(false) }
    onNext()
  }

  return (
    <div className="flex flex-col px-6 py-6 gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">What's your taste?</h2>
          <p className="text-[#535353] text-xs mt-1">Pick genres and moods — we'll use these to filter and rank recs.</p>
        </div>
        <button onClick={onSkip} className="text-[#535353] text-xs hover:text-white transition-colors flex-shrink-0 ml-3 mt-1">
          Skip
        </button>
      </div>

      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1">
        <div className="space-y-2">
          <p className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Genres</p>
          <ChipToggle options={GENRE_OPTIONS} selected={genres} onChange={setGenres} />
        </div>
        <div className="space-y-2">
          <p className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider">Moods</p>
          <ChipToggle options={MOOD_OPTIONS} selected={moods} onChange={setMoods} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors text-sm disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save & continue'}
      </button>
    </div>
  )
}

// ── Step 5: You're Ready ─────────────────────────────────────────────────────
function StepReady({ onDone }) {
  const navigate = useNavigate()
  const [completing, setCompleting] = useState(false)

  async function finish(path) {
    if (completing) return
    setCompleting(true)
    try {
      const { data } = await completeOnboarding()
      const stored = JSON.parse(localStorage.getItem('user') ?? '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, ...data.user }))
    } catch { /* still close */ }
    onDone()
    if (path) navigate(path)
  }

  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-6">
      <div className="w-16 h-16 rounded-full bg-[#1DB954]/15 flex items-center justify-center">
        <Check size={32} className="text-[#1DB954]" strokeWidth={2.5} />
      </div>

      <div className="space-y-2">
        <h2 className="text-white text-2xl font-bold">You're all set!</h2>
        <p className="text-[#B3B3B3] text-sm">Send your first rec to a friend, or explore what's new.</p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={() => finish('/friends')}
          disabled={completing}
          className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:bg-[#1ed760] transition-colors text-sm disabled:opacity-60"
        >
          Send a rec
        </button>
        <button
          onClick={() => finish(null)}
          disabled={completing}
          className="w-full border border-white/20 text-white font-semibold py-3 rounded-full hover:bg-white/5 transition-colors text-sm disabled:opacity-60"
        >
          Go to Home
        </button>
      </div>
    </div>
  )
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function OnboardingModal({ onDone }) {
  const [step, setStep] = useState(1)
  const next = () => setStep(s => s + 1)

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full md:w-[480px] bg-[#181818] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Mobile handle */}
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 flex-shrink-0" />

        <ProgressDots step={step} />

        <div className="overflow-y-auto flex-1">
          {step === 1 && <StepWelcome onNext={next} />}
          {step === 2 && <StepHowItWorks onNext={next} />}
          {step === 3 && <StepAddFriend onNext={next} onSkip={next} />}
          {step === 4 && <StepTaste onNext={next} onSkip={next} />}
          {step === 5 && <StepReady onDone={onDone} />}
        </div>
      </div>
    </div>
  )
}

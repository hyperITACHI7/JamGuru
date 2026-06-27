import { useState } from 'react'
import { addFeedback } from '../api/likes'

const TAGS = [
  'Great vocals', 'Gym song', 'Nostalgic', 'Amazing lyrics',
  'Road trip vibe', 'Late night', 'Happy vibes',
]

export default function FeedbackTags({ likeId }) {
  const [selected, setSelected] = useState([])
  const [saved, setSaved]       = useState(false)

  function toggle(tag) {
    setSelected(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    try { await addFeedback(likeId, selected) } catch (_) {}
    setSaved(true)
  }

  if (saved) {
    if (selected.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {selected.map(t => (
          <span key={t} className="text-[10px] bg-[#1DB954]/20 text-[#1DB954] px-2 py-0.5 rounded-full">
            {t}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <p className="text-[#B3B3B3] text-[11px] mb-2">What did you like about it?</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              selected.includes(tag)
                ? 'bg-[#1DB954]/20 border-[#1DB954]/50 text-[#1DB954]'
                : 'border-[#535353] text-[#B3B3B3] hover:border-white hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <button
        onClick={handleSave}
        className="text-[11px] text-[#B3B3B3] hover:text-white transition-colors"
      >
        {selected.length > 0 ? 'Save tags' : 'Skip'}
      </button>
    </div>
  )
}

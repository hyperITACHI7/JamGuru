import { useState, useRef } from 'react'
import { Plus, X } from 'lucide-react'

// Maps placeholder category → taste profile key
const TASTE_KEY = { genre: 'genres', mood: 'moods', artist: 'artists', era: 'eras' }

export default function TagPicker({ category, label, currentVals, taste, onDone, onClose }) {
  const tasteKey   = TASTE_KEY[category] ?? category
  const profileTags = taste?.[tasteKey] ?? []

  const storageKey   = `customTags_${category}`
  const [localCustom, setLocalCustom] = useState(
    () => JSON.parse(localStorage.getItem(storageKey) || '[]')
  )
  const [selected, setSelected] = useState(() => currentVals?.length ? currentVals : ['any'])
  const [customInput, setCustomInput] = useState('')
  const inputRef = useRef(null)

  const isAny = selected.includes('any')

  function toggleTag(tag) {
    if (tag === 'any') {
      setSelected(['any'])
      return
    }
    const withoutAny = selected.filter(v => v !== 'any')
    if (withoutAny.includes(tag)) {
      const next = withoutAny.filter(v => v !== tag)
      setSelected(next.length > 0 ? next : ['any'])
    } else {
      setSelected([...withoutAny, tag])
    }
  }

  function addCustom() {
    const tag = customInput.trim()
    if (!tag) return
    const updated = [...new Set([...localCustom, tag])]
    setLocalCustom(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setCustomInput('')
    const withoutAny = selected.filter(v => v !== 'any')
    setSelected([...withoutAny, tag])
    inputRef.current?.focus()
  }

  function removeCustom(tag, e) {
    e.stopPropagation()
    const updated = localCustom.filter(t => t !== tag)
    setLocalCustom(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setSelected(prev => {
      const next = prev.filter(v => v !== tag)
      return next.length > 0 ? next : ['any']
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-[#1a1a1a] rounded-t-2xl flex flex-col" style={{ maxHeight: '72vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-white font-bold capitalize">{label}</p>
            <p className="text-[#535353] text-[10px] mt-0.5">Select one or more · tap Any to leave open</p>
          </div>
          <button
            onClick={() => onDone(selected)}
            className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full hover:bg-[#e6e6e6] transition-colors"
          >
            Done
          </button>
        </div>

        {/* Tag grid */}
        <div className="overflow-y-auto flex-1 px-5 pb-5">
          <div className="flex flex-wrap gap-2 mb-5">
            {/* Any chip */}
            <button
              onClick={() => toggleTag('any')}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                isAny
                  ? 'bg-white text-black border-white font-semibold'
                  : 'border-white/20 text-[#B3B3B3] hover:border-white hover:text-white'
              }`}
            >
              Any
            </button>

            {/* Profile tags */}
            {profileTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selected.includes(tag)
                    ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954] font-semibold'
                    : 'border-[#535353] text-[#B3B3B3] hover:border-white hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}

            {/* Custom tags */}
            {localCustom.map(tag => (
              <button
                key={`c_${tag}`}
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selected.includes(tag)
                    ? 'bg-amber-400/20 border-amber-400 text-amber-400 font-semibold'
                    : 'border-amber-400/30 text-amber-400/70 hover:border-amber-400 hover:text-amber-400'
                }`}
              >
                {tag}
                <span
                  role="button"
                  onClick={e => removeCustom(tag, e)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={9} />
                </span>
              </button>
            ))}
          </div>

          {profileTags.length === 0 && localCustom.length === 0 && (
            <p className="text-[#535353] text-xs mb-4">
              No {label} in your taste profile yet — add one below or select Any.
            </p>
          )}

          {/* Custom tag input */}
          <div className="flex items-center gap-2 pt-4 border-t border-white/5">
            <input
              ref={inputRef}
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder={`Add custom ${label}…`}
              className="flex-1 bg-[#282828] text-white text-xs rounded-full px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400/50 placeholder-[#535353]"
            />
            <button
              onClick={addCustom}
              disabled={!customInput.trim()}
              className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center disabled:opacity-30 hover:bg-amber-400/30 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

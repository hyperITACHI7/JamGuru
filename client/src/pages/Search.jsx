import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, X, Play, Pause, Music, Share2 } from 'lucide-react'
import TopBar from '../components/layout/TopBar'
import { searchSongs } from '../api/songs'
import SharePanel from '../phase5/components/SharePanel'
import { usePlayer } from '../context/PlayerContext'
import { getTaste } from '../api/taste'

const CATEGORIES = [
  { name: 'Pop',        gradient: 'from-pink-500 to-rose-700' },
  { name: 'Hip-Hop',   gradient: 'from-orange-500 to-red-700' },
  { name: 'Rock',       gradient: 'from-red-600 to-red-900' },
  { name: 'Electronic', gradient: 'from-blue-500 to-indigo-700' },
  { name: 'R&B',        gradient: 'from-purple-500 to-purple-800' },
  { name: 'Indie',      gradient: 'from-green-500 to-teal-700' },
  { name: 'Classical',  gradient: 'from-amber-500 to-yellow-700' },
  { name: 'Jazz',       gradient: 'from-teal-500 to-cyan-800' },
  { name: 'Bollywood',  gradient: 'from-rose-500 to-pink-800' },
  { name: 'Country',    gradient: 'from-yellow-500 to-amber-800' },
  { name: 'Metal',      gradient: 'from-zinc-500 to-zinc-900' },
  { name: 'Latin',      gradient: 'from-lime-500 to-green-800' },
  { name: 'K-Pop',      gradient: 'from-sky-400 to-blue-700' },
  { name: 'Soul',       gradient: 'from-fuchsia-500 to-purple-800' },
]

// ── Track row ─────────────────────────────────────────────────────────────────

function TrackRow({ track, index, onSelect }) {
  const player    = usePlayer()
  const isActive  = player.isActive(track)
  const isPlaying = isActive && player.playing

  return (
    <div
      onClick={() => onSelect(track)}
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#1A1A1A] transition-colors group cursor-pointer"
    >
      {/* Index / play toggle — stops propagation so click doesn't also open panel */}
      <div className="w-5 flex-shrink-0 text-center" onClick={e => e.stopPropagation()}>
        <span className={`text-sm text-[#B3B3B3] group-hover:hidden ${isPlaying ? 'hidden' : ''}`}>
          {index + 1}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); player.toggle(track) }}
          className={`hidden group-hover:block text-white ${isPlaying ? '!block' : ''}`}
          title={track.previewUrl ? (isPlaying ? 'Pause' : 'Play preview') : 'No preview available'}
        >
          {isPlaying
            ? <Pause size={14} className="text-[#1DB954]" fill="currentColor" />
            : <Play size={14} fill="currentColor" className={track.previewUrl ? '' : 'text-[#535353]'} />
          }
        </button>
      </div>

      {/* Album art */}
      <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-[#282828]">
        {track.albumArtUrl
          ? <img src={track.albumArtUrl} alt={track.album} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Music size={14} className="text-[#B3B3B3]" />
            </div>
        }
      </div>

      {/* Title + artist */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#1DB954]' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-[#B3B3B3] text-xs truncate">{track.artist}</p>
      </div>

      {/* Album */}
      <p className="text-[#B3B3B3] text-xs truncate hidden md:block max-w-[180px]">{track.album}</p>

      {/* Preview badge */}
      {track.previewUrl && (
        <span className="text-[#1DB954] text-[10px] font-semibold hidden group-hover:block flex-shrink-0">
          PREVIEW
        </span>
      )}

      {/* Share icon */}
      <Share2 size={15} className="flex-shrink-0 text-[#B3B3B3] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ── Song panel ───────────────────────────────────────────────────────────────

function SongPanel({ song, onShare, onClose }) {
  const player    = usePlayer()
  const isActive  = player.isActive(song)
  const isPlaying = isActive && player.playing

  return (
    <div className="border-t border-[#2a2a2a] bg-[#181818] px-6 py-4 flex items-center gap-4 flex-shrink-0">
      {/* Art */}
      <div className="w-14 h-14 flex-shrink-0 rounded shadow-lg overflow-hidden bg-[#282828]">
        {song.albumArtUrl
          ? <img src={song.albumArtUrl} alt={song.album} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Music size={20} className="text-[#B3B3B3]" /></div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{song.title}</p>
        <p className="text-[#B3B3B3] text-xs truncate">{song.artist} · {song.album}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {song.previewUrl ? (
          <button
            onClick={() => player.toggle(song)}
            className="flex items-center gap-2 bg-[#282828] hover:bg-[#3e3e3e] text-white text-xs font-semibold px-3 py-2 rounded-full transition-colors"
          >
            {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            {isPlaying ? 'Pause' : 'Preview'}
          </button>
        ) : (
          <span className="text-[#535353] text-xs">No preview</span>
        )}

        <button
          onClick={onShare}
          className="flex items-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold px-4 py-2 rounded-full transition-colors"
        >
          <Share2 size={13} />
          Share
        </button>

        <button onClick={onClose} className="text-[#B3B3B3] hover:text-white p-1 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

// ── Main Search page ──────────────────────────────────────────────────────────

// Map taste genre names to CATEGORIES names for matching
const TASTE_TO_CATEGORY = {
  'hip-hop':    'Hip-Hop',
  'r&b':        'R&B',
  'pop':        'Pop',
  'rock':       'Rock',
  'indie':      'Indie',
  'electronic': 'Electronic',
  'jazz':       'Jazz',
  'classical':  'Classical',
  'metal':      'Metal',
  'latin':      'Latin',
  'soul':       'Soul',
  'country':    'Country',
  'folk':       'Indie',  // fold into Indie
  'reggae':     null,     // no match in categories
}

export default function Search() {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [selectedSong, setSelectedSong]     = useState(null)
  const [sharePanelSong, setSharePanelSong] = useState(null)
  const [preferredCats, setPreferredCats]   = useState(new Set())
  const inputRef = useRef(null)
  const player   = usePlayer()

  // Focus the input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Load taste profile to personalise category order
  useEffect(() => {
    getTaste()
      .then(({ data }) => {
        const preferred = new Set()
        for (const g of (data.genres || [])) {
          const cat = TASTE_TO_CATEGORY[g]
          if (cat) preferred.add(cat)
        }
        setPreferredCats(preferred)
      })
      .catch(() => {})
  }, [])

  // Sort: preferred genres first, others follow in original order
  const sortedCategories = preferredCats.size > 0
    ? [
        ...CATEGORIES.filter(c => preferredCats.has(c.name)),
        ...CATEGORIES.filter(c => !preferredCats.has(c.name)),
      ]
    : CATEGORIES

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setError(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await searchSongs(q)
        setResults(data.tracks)
      } catch {
        setError('Search failed. Please try again.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const showBrowse  = query.trim().length < 2
  const showResults = !loading && results.length > 0
  const showEmpty   = !loading && !error && query.trim().length >= 2 && results.length === 0

  function handleTrackSelect(track) {
    setSelectedSong(track)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />

      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* Search input */}
        <div className="mb-6 max-w-xl">
          <h1 className="text-white font-bold text-2xl mb-4">Search</h1>
          <div className="relative">
            <SearchIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="What do you want to listen to?"
              className="w-full bg-white text-black font-medium py-3 pl-10 pr-9 rounded-full focus:outline-none focus:ring-2 focus:ring-white placeholder-[#6a6a6a] text-sm"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setSelectedSong(null); inputRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6a6a] hover:text-black transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {query.trim().length === 1 && (
            <p className="text-[#6a6a6a] text-xs mt-2 pl-3">Type at least 2 characters to search</p>
          )}
        </div>

        {/* Browse categories */}
        {showBrowse && (
          <div>
            <h2 className="text-white font-bold text-xl mb-4">Browse all</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              {sortedCategories.map(cat => {
                const isPref = preferredCats.has(cat.name)
                return (
                  <button
                    key={cat.name}
                    onClick={() => { setQuery(cat.name); inputRef.current?.focus() }}
                    className={`rounded-xl overflow-hidden bg-gradient-to-br ${cat.gradient} p-4 h-24 relative text-left shadow-md hover:scale-[1.04] transition-transform cursor-pointer ${isPref ? 'ring-2 ring-[#1DB954] ring-offset-1 ring-offset-[#121212]' : ''}`}
                  >
                    <span className="text-white font-bold text-sm leading-tight">{cat.name}</span>
                    {isPref && (
                      <span className="absolute top-2 right-2 text-[8px] font-bold text-white/80 uppercase tracking-wider">
                        Your taste
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p className="text-red-400 text-center py-12 text-sm">{error}</p>
        )}

        {/* No results */}
        {showEmpty && (
          <div className="text-center py-16">
            <p className="text-white font-bold text-xl mb-2">
              No results found for &ldquo;{query.trim()}&rdquo;
            </p>
            <p className="text-[#B3B3B3] text-sm max-w-sm mx-auto">
              Please make sure your words are spelled correctly, or use fewer or different keywords.
            </p>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-xl">Songs</h2>
              <span className="text-[#B3B3B3] text-xs">{results.length} results</span>
            </div>

            {/* Column header */}
            <div className="flex items-center gap-3 px-3 pb-2 border-b border-[#2a2a2a] mb-1">
              <span className="w-5 text-[#B3B3B3] text-xs text-center">#</span>
              <span className="w-10 flex-shrink-0" />
              <span className="flex-1 text-[#B3B3B3] text-xs uppercase tracking-wider font-semibold">Title</span>
              <span className="text-[#B3B3B3] text-xs uppercase tracking-wider font-semibold hidden md:block w-[180px]">Album</span>
              <span className="w-20" />
            </div>

            <div>
              {results.map((track, i) => (
                <TrackRow
                  key={track.spotifyId}
                  track={track}
                  index={i}
                  onSelect={handleTrackSelect}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Song panel */}
      {selectedSong && (
        <SongPanel
          song={selectedSong}
          onShare={() => setSharePanelSong(selectedSong)}
          onClose={() => setSelectedSong(null)}
        />
      )}

      {/* Share modal */}
      {sharePanelSong && (
        <SharePanel
          song={sharePanelSong}
          onClose={() => setSharePanelSong(null)}
        />
      )}
    </div>
  )
}

// 6 templates: 1 with 2 slots, 2 with 3 slots, 3 with 4 slots
// placeholders[key].category maps to taste profile keys: 'genre'→genres, 'mood'→moods, etc.
export const REQUEST_TEMPLATES = [
  {
    id: 1,
    label: 'Just a Vibe',
    template: 'Something {mood} and {genre}',
    placeholders: {
      mood:  { label: 'mood',  category: 'mood' },
      genre: { label: 'genre', category: 'genre' },
    },
  },
  {
    id: 2,
    label: 'Time Machine',
    template: 'A {genre} song from {era} that feels {mood}',
    placeholders: {
      genre: { label: 'genre', category: 'genre' },
      era:   { label: 'era',   category: 'era' },
      mood:  { label: 'mood',  category: 'mood' },
    },
  },
  {
    id: 3,
    label: 'Artist Energy',
    template: 'Something like {artist} but more {mood} — {genre} influenced',
    placeholders: {
      artist: { label: 'artist', category: 'artist' },
      mood:   { label: 'mood',   category: 'mood' },
      genre:  { label: 'genre',  category: 'genre' },
    },
  },
  {
    id: 4,
    label: 'Set the Scene',
    template: 'I need a {mood} {genre} song from {era}, something like {artist}',
    placeholders: {
      mood:   { label: 'mood',   category: 'mood' },
      genre:  { label: 'genre',  category: 'genre' },
      era:    { label: 'era',    category: 'era' },
      artist: { label: 'artist', category: 'artist' },
    },
  },
  {
    id: 5,
    label: 'Moment Match',
    template: 'A {mood} {genre} track that sounds like {artist} — {era} era',
    placeholders: {
      mood:   { label: 'mood',   category: 'mood' },
      genre:  { label: 'genre',  category: 'genre' },
      artist: { label: 'artist', category: 'artist' },
      era:    { label: 'era',    category: 'era' },
    },
  },
  {
    id: 6,
    label: 'Sound Quest',
    template: 'Give me {genre} with {mood} energy — {era} sound, think {artist}',
    placeholders: {
      genre:  { label: 'genre',  category: 'genre' },
      mood:   { label: 'mood',   category: 'mood' },
      era:    { label: 'era',    category: 'era' },
      artist: { label: 'artist', category: 'artist' },
    },
  },
]

// ['a', 'b', 'c'] → 'a, b or c' | ['a'] → 'a' | [] → ''
export function joinTags(arr) {
  if (!arr || arr.length === 0) return ''
  if (arr.length === 1) return arr[0]
  return arr.slice(0, -1).join(', ') + ' or ' + arr[arr.length - 1]
}

// variables[key] is an array; 'any' sentinel → 'any [label]'
export function renderTemplate(templateId, variables) {
  const t = REQUEST_TEMPLATES.find(t => t.id === templateId)
  if (!t) return ''
  return t.template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = variables[key]
    const ph  = t.placeholders[key]
    if (!val || (Array.isArray(val) && val.length === 0)) return `[${ph?.label ?? key}]`
    if (Array.isArray(val)) {
      if (val.includes('any')) return `any ${ph?.label ?? key}`
      return joinTags(val)
    }
    return val
  })
}

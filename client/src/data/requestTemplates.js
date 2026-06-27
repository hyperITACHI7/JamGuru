export const REQUEST_TEMPLATES = [
  {
    id: 1,
    label: 'Occasion',
    template: 'I need a {var1} song for {var2}',
    placeholders: {
      var1: { label: 'vibe',     options: ['chill', 'hype', 'emotional', 'feel-good', 'raw'] },
      var2: { label: 'occasion', options: ['late night', 'the gym', 'a long drive', 'studying', 'Sunday morning'] },
    },
  },
  {
    id: 2,
    label: 'Genre Exploration',
    template: 'Send me something that sounds like {var1} but feels {var2}',
    placeholders: {
      var1: { label: 'genre',   options: ['hip-hop', 'indie', 'R&B', 'electronic', 'soul'] },
      var2: { label: 'quality', options: ['nostalgic', 'energizing', 'melancholic', 'euphoric', 'grounding'] },
    },
  },
  {
    id: 3,
    label: 'Mood',
    template: 'Something {var1} for when {var2}',
    placeholders: {
      var1: { label: 'quality', options: ['slow and heavy', 'light and free', 'dark and moody', 'warm and fuzzy', 'chaotic'] },
      var2: { label: 'feeling', options: ["everything feels too loud", "I just need to move", "I'm missing someone", "I need a confidence boost", "it's that kind of day"] },
    },
  },
]

export function renderTemplate(templateId, variables) {
  const t = REQUEST_TEMPLATES.find(t => t.id === templateId)
  if (!t) return ''
  return t.template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `[${key}]`)
}

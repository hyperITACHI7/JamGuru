import api from '../../api/axios'

export const getAiContext    = (friendId) => api.get(`/ai/context/${friendId}`)
export const getAiSuggestion = (friendId) => api.post(`/ai/suggest/${friendId}`)
export const suggestForMe    = ()         => api.post('/ai/suggest/me')

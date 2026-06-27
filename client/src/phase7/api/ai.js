import api from '../../api/axios'

export const getAiContext    = (friendId)  => api.get(`/ai/context/${friendId}`)
export const getAiSuggestion = (friendId) => api.post(`/ai/suggest/${friendId}`)
export const suggestForMe    = ()         => api.post('/ai/suggest/me')
export const rankForRequest       = (requestId) => api.post('/ai/rank-for-request', { requestId })
export const getGroupAiSuggestion = (groupId)  => api.post(`/ai/suggest/group/${groupId}`)
export const rankForGroupRequest  = (requestId) => api.post('/ai/rank-for-group-request', { requestId })

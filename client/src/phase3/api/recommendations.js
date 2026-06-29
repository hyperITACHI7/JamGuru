import api from '../../api/axios'

export const sendRecommendation       = (body)            => api.post('/recommendations', body)
export const getInbox                 = (sort = 'latest') => api.get(`/recommendations/inbox${sort === 'score' ? '?sort=score' : ''}`)
export const getConversation          = (friendId)        => api.get(`/recommendations/conversation/${friendId}`)
export const reconsiderRecommendation = (recId)           => api.patch(`/recommendations/${recId}/reconsider`)
export const getFriendSongStatus      = (friendId, ids)   => api.get(`/recommendations/friend-status/${friendId}?ids=${ids.join(',')}`)

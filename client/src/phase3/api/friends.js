import api from '../../api/axios'

export const getFriends         = ()         => api.get('/friends')
export const getFriendRequests  = ()         => api.get('/friends/requests')
export const searchUsers        = (q)        => api.get(`/friends/search?q=${encodeURIComponent(q)}`)
export const sendFriendRequest  = (targetId) => api.post(`/friends/request/${targetId}`)
export const acceptFriendRequest= (requesterId) => api.post(`/friends/accept/${requesterId}`)
export const removeFriend       = (userId)   => api.delete(`/friends/${userId}`)

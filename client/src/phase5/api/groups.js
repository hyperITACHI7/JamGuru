import api from '../../api/axios'

export const createGroup  = (data)          => api.post('/groups', data)
export const getGroups    = ()              => api.get('/groups')
export const getGroup     = (id)            => api.get(`/groups/${id}`)
export const addMember    = (id, userId)    => api.post(`/groups/${id}/members`, { userId })
export const removeMember = (id, userId)    => api.delete(`/groups/${id}/members/${userId}`)

export const sendGroupRec = (id, data)      => api.post(`/groups/${id}/recommendations`, data)
export const getGroupFeed = (id)            => api.get(`/groups/${id}/feed`)

export const likeGroupRec   = (groupId, recId) => api.post(`/groups/${groupId}/recommendations/${recId}/like`)
export const unlikeGroupRec = (groupId, recId) => api.delete(`/groups/${groupId}/recommendations/${recId}/like`)

export const getGroupScore    = (id)            => api.get(`/groups/${id}/score`)
export const sendGroupRequest = (id, data)      => api.post(`/groups/${id}/requests`, data)

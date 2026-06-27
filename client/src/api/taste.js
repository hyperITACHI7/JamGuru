import api from './axios'

export const getTaste        = ()       => api.get('/profile/taste')
export const getTasteByUser  = (username) => api.get(`/profile/taste/${username}`)
export const updateTaste     = (data)   => api.patch('/profile/taste', data)
export const refreshTaste    = ()       => api.post('/profile/taste/refresh')

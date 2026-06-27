import api from './axios'

export const getProfile    = (username) => api.get(`/users/${username}`)
export const updateProfile = (data)     => api.patch('/users/me', data)

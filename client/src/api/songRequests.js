import api from './axios'

export const sendSongRequest = (body) => api.post('/song-requests', body)

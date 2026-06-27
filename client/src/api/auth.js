import api from './axios'

export const register        = (data) => api.post('/auth/register', data)
export const login           = (data) => api.post('/auth/login', data)
export const getMe           = ()     => api.get('/auth/me')
export const syncSpotifyLikes  = ()            => api.post('/auth/spotify/sync-liked')
export const importPlaylist    = (playlistUrl) => api.post('/auth/spotify/import-playlist', { playlistUrl })

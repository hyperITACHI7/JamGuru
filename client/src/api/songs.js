import api from './axios'

export const searchSongs    = (q)  => api.get(`/songs/search?q=${encodeURIComponent(q)}`)
export const getSong        = (id) => api.get(`/songs/${id}`)
export const getNewReleases = ()   => api.get('/songs/browse/new-releases')
export const getLikedSongs  = ()   => api.get('/likes/songs')
export const isSongLiked    = (id) => api.get(`/songs/${id}/liked`)
export const likeSong       = (id) => api.post(`/songs/${id}/like`)
export const unlikeSong     = (id) => api.delete(`/songs/${id}/like`)

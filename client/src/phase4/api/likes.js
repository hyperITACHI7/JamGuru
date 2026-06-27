import api from '../../api/axios'

export const likeRecommendation    = (recId)        => api.post(`/recommendations/${recId}/like`)
export const unlikeRecommendation  = (recId)        => api.delete(`/recommendations/${recId}/like`)
export const dismissRecommendation = (recId)        => api.post(`/recommendations/${recId}/dismiss`)
export const dislikeRecommendation = (recId)        => api.post(`/recommendations/${recId}/dislike`)
export const dislikeSong           = (spotifyId)    => api.post(`/songs/${spotifyId}/dislike`)
export const addFeedback           = (likeId, tags) => api.post(`/likes/${likeId}/feedback`, { tags })

import api from '../../api/axios'

export const likeRecommendation   = (recId)           => api.post(`/recommendations/${recId}/like`)
export const unlikeRecommendation = (recId)           => api.delete(`/recommendations/${recId}/like`)
export const addFeedback          = (likeId, tags)    => api.post(`/likes/${likeId}/feedback`, { tags })

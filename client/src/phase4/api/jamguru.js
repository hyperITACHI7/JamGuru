import api from '../../api/axios'

export const getMyJamGuru     = ()  => api.get('/jamguru/mine')
export const getJamGuruCount  = ()  => api.get('/jamguru/count')
export const getTrustRankings = ()  => api.get('/trust-rankings')

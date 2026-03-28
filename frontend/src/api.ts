import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const fleetApi = {
  getOverview: () => api.get('/fleet/overview'),
  getAircraft: (id: number) => api.get(`/fleet/aircraft/${id}`),
};

export const componentsApi = {
  getRankings: () => api.get('/components/risk-rankings'),
  getDetail: (id: number) => api.get(`/components/${id}/detail`),
  exportCSV: () => `${API_BASE_URL}/components/risk-rankings/export`,
};

export const adminApi = {
  regenerateData: () => api.post('/data/regenerate'),
  getModelStats: () => api.get('/admin/model-stats'),
};

export default api;

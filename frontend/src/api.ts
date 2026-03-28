import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const fleetApi = {
  getOverview: () => api.get('/fleet/overview'),
  getHealthScore: () => api.get('/fleet/health-score'),
};

export const componentsApi = {
  getRankings: () => api.get('/components/risk-rankings'),
  getRiskDetails: (id: number) => api.get(`/components/${id}/risk`),
  getRiskTrend: (id: number) => api.get(`/components/${id}/risk-trend`),
  exportCSV: () => `${API_BASE_URL}/components/risk-rankings/export`,
};

export const aircraftApi = {
  getComponents: (id: number) => api.get(`/aircraft/${id}/components`),
};

export const maintenanceApi = {
  getSchedule: () => api.get('/maintenance/schedule'),
};

export const settingsApi = {
  updateWeights: (weights: {safety: number, operational: number, cost: number}) => 
    api.post('/settings/impact-weights', weights),
};

export const adminApi = {
  regenerateData: () => api.post('/data/regenerate'),
};

export default api;

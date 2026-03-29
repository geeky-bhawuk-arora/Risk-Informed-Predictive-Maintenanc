import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

export const fleetApi = {
    getOverview: () => apiClient.get('/fleet/overview').then(r => r.data),
    getHealthTrend: () => apiClient.get('/fleet/health-score').then(r => r.data),
    getBreakdown: () => apiClient.get('/fleet/breakdown').then(r => r.data),
    getTierChanges: () => apiClient.get('/fleet/tier-changes').then(r => r.data),
};

export const componentApi = {
    getRiskRankings: (page = 1, limit = 50, level?: string, cat?: string, search?: string) => 
        apiClient.get('/components/risk-rankings', { params: { page, limit, level, cat, search } }).then(r => r.data),
    getRiskDetail: (id: string | number) => apiClient.get(`/components/${id}/risk`).then(r => r.data),
    getSensorHistory: (id: string | number) => apiClient.get(`/components/${id}/sensor-history`).then(r => r.data),
    getRiskTrend: (id: string | number) => apiClient.get(`/components/${id}/risk-trend`).then(r => r.data),
    getMaintenanceHistory: (id: string | number) => apiClient.get(`/components/${id}/maintenance-history`).then(r => r.data),
    exportRankings: () => `${API_BASE_URL}/components/risk-rankings/export`,
};

export const aircraftApi = {
    getAll: (page = 1, limit = 50) => apiClient.get('/aircraft', { params: { page, limit } }).then(r => r.data),
    getDetail: (id: string | number) => apiClient.get(`/aircraft/${id}/health`).then(r => r.data),
    getComponents: (id: string | number) => apiClient.get(`/aircraft/${id}/components`).then(r => r.data),
};

export const settingsApi = {
    getWeights: () => apiClient.get('/settings/impact-weights').then(r => r.data),
    updateWeights: (weights: { safety: number; operational: number; cost: number }) => 
        apiClient.post('/settings/impact-weights', weights).then(r => r.data),
    regenerateData: () => apiClient.post('/data/regenerate').then(r => r.data),
    getJobStatus: (id: string) => apiClient.get(`/jobs/${id}`).then(r => r.data),
};

export const modelApi = {
    getPerformance: () => apiClient.get('/model/performance').then(r => r.data),
};

import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

export const getFleet = () => api.get('/aircraft');
export const getAircraft = (id: number) => api.get(`/aircraft/${id}`);
export const getComponent = (id: number) => api.get(`/components/${id}`);
export const getFleetRisk = () => api.get('/risk/fleet');
export const getPriorities = () => api.get('/priorities');
export const recomputeRisk = () => api.post('/risk/recompute');

export default api;

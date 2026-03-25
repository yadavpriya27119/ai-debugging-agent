import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

export const api = axios.create({ baseURL: API_BASE });

export const getStats = () => api.get('/errors/stats/summary');
export const getErrors = (page = 1) => api.get(`/errors?page=${page}&limit=15`);
export const getErrorById = (id) => api.get(`/errors/${id}`);
export const getFixes = (page = 1) => api.get(`/fixes?page=${page}&limit=15`);
export const getFixById = (id) => api.get(`/fixes/${id}`);
export const triggerTestError = (data) => api.post('/errors/test', data);
export const getHealth = () => api.get('/health');

// Settings
export const getSettings = () => api.get('/settings');
export const saveSettings = (data) => api.put('/settings', data);
export const getLearningStats = () => api.get('/settings/learning-stats');
export const getWebhookInfo = () => api.get('/settings/webhooks');

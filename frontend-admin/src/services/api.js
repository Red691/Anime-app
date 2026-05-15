// src/services/api.js
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const animeApi = {
  getAll: (params) => api.get('/anime', { params }),
  getById: (id) => api.get(`/anime/${id}`),
  create: (data) => api.post('/anime', data),
  update: (id, data) => api.put(`/anime/${id}`, data),
  delete: (id) => api.delete(`/anime/${id}`),
  getTrending: () => api.get('/anime/trending'),
  getStats: () => api.get('/admin/dashboard'),
};

export const episodeApi = {
  create: (data) => api.post('/episodes', data),
  update: (id, data) => api.put(`/episodes/${id}`, data),
  delete: (id) => api.delete(`/episodes/${id}`),
};

export const userApi = {
  getAll: (params) => api.get('/admin/users', { params }),
  updateStatus: (id, data) => api.put(`/admin/users/${id}`, data),
  getStats: () => api.get('/admin/dashboard'),
};

export default api;

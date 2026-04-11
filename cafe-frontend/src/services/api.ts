import axios from 'axios';

// Base API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle common errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Generic API methods
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<unknown, T>(url, { params }),

  post: <T>(url: string, data?: unknown) => apiClient.post<unknown, T>(url, data),

  put: <T>(url: string, data?: unknown) => apiClient.put<unknown, T>(url, data),

  patch: <T>(url: string, data?: unknown) => apiClient.patch<unknown, T>(url, data),

  delete: <T>(url: string) =>
    apiClient.delete<unknown, T>(url),
};

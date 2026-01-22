import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - logout user
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// API service functions
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    googleLogin: (credential) => api.post('/auth/google', { credential }),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const productsAPI = {
    search: (params) => api.get('/products/search', { params }),
    getWinning: (params) => api.get('/products/winning', { params }),
    getById: (id) => api.get(`/products/${id}`),
    analyze: (productId) => api.post(`/products/${productId}/analyze`),
    import: (data) => api.post('/products/import', data),
    getImported: (params) => api.get('/products/imported/list', { params }),
};

export const aiAPI = {
    analyze: (productId) => api.post('/ai/analyze', { productId }),
    generateDescription: (productId, style) => api.post('/ai/description', { productId, style }),
    getPricing: (productId) => api.post('/ai/pricing', { productId }),
    getMarketing: (productId) => api.post('/ai/marketing', { productId }),
    getSuggestions: () => api.get('/ai/suggestions'),
};

export const storesAPI = {
    getAll: () => api.get('/stores'),
    connect: (data) => api.post('/stores/connect', data),
    getById: (id) => api.get(`/stores/${id}`),
    update: (id, data) => api.put(`/stores/${id}`, data),
    delete: (id) => api.delete(`/stores/${id}`),
    sync: (id) => api.post(`/stores/${id}/sync`),
};

export const ordersAPI = {
    getAll: (params) => api.get('/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    fulfill: (id) => api.post(`/orders/${id}/fulfill`),
    updateTracking: (id, data) => api.put(`/orders/${id}/tracking`, data),
    updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
    getTracking: (id) => api.get(`/orders/${id}/track`),
};

export const subscriptionsAPI = {
    getStatus: () => api.get('/subscriptions'),
    getPlans: () => api.get('/subscriptions/plans'),
    checkout: (plan) => api.post('/subscriptions/checkout', { plan }),
    getPortal: () => api.post('/subscriptions/portal'),
    cancel: () => api.post('/subscriptions/cancel'),
    resume: () => api.post('/subscriptions/resume'),
};

export const analyticsAPI = {
    getDashboard: (period) => api.get('/analytics/dashboard', { params: { period } }),
    getSales: (params) => api.get('/analytics/sales', { params }),
    getProducts: (limit) => api.get('/analytics/products', { params: { limit } }),
    getROI: () => api.get('/analytics/roi'),
    export: (type, format) => api.get('/analytics/export', { params: { type, format } }),
};

export const notificationsAPI = {
    getAll: (params) => api.get('/notifications', { params }),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
};

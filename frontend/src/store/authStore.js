import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            subscription: null,
            isAuthenticated: false,
            isLoading: true,

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setToken: (token) => set({ token }),

            login: async (email, password) => {
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { user, token } = response.data.data;
                    set({ user, token, isAuthenticated: true });
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error?.message || 'Login failed'
                    };
                }
            },

            register: async (email, password, fullName) => {
                try {
                    const response = await api.post('/auth/register', { email, password, fullName });
                    const { user, token } = response.data.data;
                    set({ user, token, isAuthenticated: true });
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error?.message || 'Registration failed'
                    };
                }
            },

            googleLogin: async (credential) => {
                try {
                    const response = await api.post('/auth/google', { credential });
                    const { user, token } = response.data.data;
                    set({ user, token, isAuthenticated: true });
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error?.message || 'Google login failed'
                    };
                }
            },

            logout: async () => {
                try {
                    await api.post('/auth/logout');
                } catch (error) {
                    console.error('Logout error:', error);
                }
                set({ user: null, token: null, subscription: null, isAuthenticated: false });
            },

            checkAuth: async () => {
                const token = get().token;
                if (!token) {
                    set({ isLoading: false });
                    return;
                }

                try {
                    const response = await api.get('/auth/me');
                    const { user, subscription } = response.data.data;
                    set({ user, subscription, isAuthenticated: true, isLoading: false });
                } catch (error) {
                    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
                }
            },

            updateProfile: async (data) => {
                try {
                    const response = await api.put('/auth/profile', data);
                    set({ user: response.data.data.user });
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error?.message || 'Update failed'
                    };
                }
            },

            forgotPassword: async (email) => {
                try {
                    await api.post('/auth/forgot-password', { email });
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error?.message || 'Request failed'
                    };
                }
            },

            resetPassword: async (token, password) => {
                try {
                    await api.post('/auth/reset-password', { token, password });
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error?.message || 'Reset failed'
                    };
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token }),
        }
    )
);

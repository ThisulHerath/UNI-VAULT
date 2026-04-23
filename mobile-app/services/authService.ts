import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  university?: string;
  batch?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  login: async (data: LoginData) => {
    const res = await api.post('/auth/login', data);
    if (res.data.token) {
      await AsyncStorage.setItem('univault_token', res.data.token);
      await AsyncStorage.setItem('univault_user', JSON.stringify(res.data.data));
    }
    return res.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('univault_token');
    await AsyncStorage.removeItem('univault_user');
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateProfile: async (formData: FormData) => {
    const res = await api.put('/auth/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.put('/auth/password', { currentPassword, newPassword });
    return res.data;
  },

  deleteAccount: async () => {
    const res = await api.delete('/auth/me');
    return res.data;
  },

  getStoredUser: async () => {
    const user = await AsyncStorage.getItem('univault_user');
    return user ? JSON.parse(user) : null;
  },

  getStoredToken: async () => {
    return await AsyncStorage.getItem('univault_token');
  },
};

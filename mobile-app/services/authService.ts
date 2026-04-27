import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeApiAssetUrl } from './api';

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
  register: async (data: RegisterData | FormData) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const res = await api.post('/auth/register', data, isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined);
    if (res.data.token) {
      await AsyncStorage.setItem('univault_token', res.data.token);
    }
    if (res.data.data) {
      await AsyncStorage.setItem('univault_user', JSON.stringify(res.data.data));
    }
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
    if (res.data.token) {
      await AsyncStorage.setItem('univault_token', res.data.token);
    }
    if (res.data.data) {
      await AsyncStorage.setItem('univault_user', JSON.stringify(res.data.data));
    }
    return res.data;
  },

  deleteAccount: async () => {
    const res = await api.delete('/auth/me');
    return res.data;
  },

  getStoredUser: async () => {
    const user = await AsyncStorage.getItem('univault_user');
    if (!user) return null;

    const parsedUser = JSON.parse(user);
    if (parsedUser && typeof parsedUser === 'object' && 'avatar' in parsedUser) {
      parsedUser.avatar = normalizeApiAssetUrl(parsedUser.avatar as string | null);
    }

    return parsedUser;
  },

  setStoredUser: async (user: unknown) => {
    if (user && typeof user === 'object' && 'avatar' in (user as Record<string, unknown>)) {
      const normalizedUser = {
        ...(user as Record<string, unknown>),
        avatar: normalizeApiAssetUrl((user as Record<string, unknown>).avatar as string | null),
      };
      await AsyncStorage.setItem('univault_user', JSON.stringify(normalizedUser));
      return;
    }

    await AsyncStorage.setItem('univault_user', JSON.stringify(user));
  },

  getStoredToken: async () => {
    return await AsyncStorage.getItem('univault_token');
  },
};

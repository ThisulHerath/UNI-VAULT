import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const getDevHost = () => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  return hostUri ? hostUri.split(':')[0] : 'localhost';
};

const defaultHost = getDevHost();
const resolvedHost =
  Platform.OS === 'android' && defaultHost === 'localhost' ? '10.0.2.2' : defaultHost;

export const API_ORIGIN = envApiUrl
  ? envApiUrl.replace(/\/$/, '').replace(/\/api$/, '')
  : `http://${resolvedHost}:5000`;
export const BASE_URL = `${API_ORIGIN}/api`;

const LOCAL_BACKEND_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

export const normalizeApiAssetUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return `${API_ORIGIN}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (LOCAL_BACKEND_HOSTS.has(parsed.hostname)) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
};

const normalizeAssetUrlsInPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeAssetUrlsInPayload(item));
  }

  const clone: Record<string, unknown> = { ...(payload as Record<string, unknown>) };

  Object.keys(clone).forEach((key) => {
    const value = clone[key];
    if (key === 'avatar' || key === 'coverImage') {
      clone[key] = normalizeApiAssetUrl(typeof value === 'string' ? value : null);
      return;
    }
    clone[key] = normalizeAssetUrlsInPayload(value);
  });

  return clone;
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Bypass ngrok's HTML interstitial page
  },
});

// Attach JWT token to every request automatically
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('univault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
api.interceptors.response.use(
  (response) => {
    response.data = normalizeAssetUrlsInPayload(response.data);
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Android Emulator: 10.0.2.2 maps to your PC's localhost — no ngrok needed!
export const BASE_URL = 'http://10.0.2.2:5000/api';

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
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;

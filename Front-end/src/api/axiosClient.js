// src/axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  // Ensure frontend calls go to backend API root. If VITE_API_URL is set it can override.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
});

// Tự động thêm Token vào Header mỗi khi gọi API
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('app_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;
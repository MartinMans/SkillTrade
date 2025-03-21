import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000', // Fallback to localhost if env var is not set
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to handle errors
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Handle unauthorized
          localStorage.removeItem('token');
          // Redirect to login if needed
          break;
        case 403:
          // Handle forbidden
          break;
        case 404:
          // Handle not found
          break;
        case 500:
          // Handle server error
          break;
      }
    }
    return Promise.reject(error);
  }
);

// API service with typed endpoints
export const apiService = {
  // Auth endpoints
  signup: (data: { username: string; email: string; password: string }) =>
    api.post('/users/', data),
  login: (data: { username: string; password: string }) =>
    api.post('/login', data),

  // User endpoints
  getCurrentUser: () => api.get('/users/me'),
  getUserProfile: (userId: string) => api.get(`/users/${userId}`),

  // Skills endpoints
  getSkills: () => api.get('/skills/'),
  addSkill: (data: { skill_name: string }) => api.post('/skills/', data),
};

export default api;
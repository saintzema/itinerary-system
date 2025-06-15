import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API_ENDPOINT = `${API_BASE_URL}/api`;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_ENDPOINT,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error.response?.data || error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    return api.post('/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
  
  register: (userData) => api.post('/users', userData),
  
  getCurrentUser: () => api.get('/users/me'),
};

export const eventsAPI = {
  getEvents: (params = {}) => api.get('/events', { params }),
  
  createEvent: (eventData) => api.post('/events', eventData),
  
  updateEvent: (id, eventData) => api.put(`/events/${id}`, eventData),
  
  deleteEvent: (id) => api.delete(`/events/${id}`),
  
  getEvent: (id) => api.get(`/events/${id}`),
};

export const notificationsAPI = {
  getNotifications: () => api.get('/notifications'),
  
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
};

// Health check
export const healthAPI = {
  check: () => api.get('/'),
};

export default api;
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if it exists
apiClient.interceptors.request.use(
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

// User APIs
export const userAPI = {
  signup: (credentials) => apiClient.post('/users/signup', credentials),
  login: (credentials) => apiClient.post('/users/login', credentials),
  getUser: (userId) => apiClient.get(`/users/${userId}`),
  getAllUsers: () => apiClient.get('/users'),
  updateUser: (userId, data) => apiClient.put(`/users/${userId}`, data)
};

// Message APIs
export const messageAPI = {
  sendMessage: (messageData) => apiClient.post('/messages/send', messageData),
  getMessages: (senderId, receiverId) => 
    apiClient.get('/messages', { params: { senderId, receiverId } }),
  deleteMessage: (messageId) => apiClient.delete(`/messages/${messageId}`),
  deleteMessages: (senderId, receiverId) => 
    apiClient.delete('/messages', { params: { senderId, receiverId } })
};

export default apiClient;

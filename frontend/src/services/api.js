import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const BASE_SERVER_URL = API_URL.replace(/\/api$/, '');

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

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const normalizeFileUrl = (fileUrl) => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('data:') || fileUrl.startsWith('blob:')) return fileUrl;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith('/')) return `${BASE_SERVER_URL}${fileUrl}`;
  return `${BASE_SERVER_URL}/${fileUrl}`;
};

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
  sendGroupMessage: (messageData) => apiClient.post('/messages/send-group', messageData),
  sendAttachment: (attachmentData) => apiClient.post('/messages/send-attachment', attachmentData),
  getMessages: (senderId, receiverId) =>
    apiClient.get('/messages', { params: { senderId, receiverId } }),
  getConversationSummaries: (userId) => apiClient.get(`/messages/conversations/${userId}`),
  markConversationAsRead: (senderId, receiverId) =>
    apiClient.put('/messages/read', { senderId, receiverId }),
  deleteMessage: (messageId) => apiClient.delete(`/messages/${messageId}`),
  deleteMessages: (senderId, receiverId) =>
    apiClient.delete('/messages', { params: { senderId, receiverId } })
};

// Group APIs
export const groupAPI = {
  createGroup: (groupData) => apiClient.post('/groups/create', groupData),
  getUserGroups: () => apiClient.get('/groups'),
  getGroup: (groupId) => apiClient.get(`/groups/${groupId}`),
  updateGroup: (groupId, groupData) => apiClient.put(`/groups/${groupId}`, groupData),
  addMember: (groupId, userId) => apiClient.post(`/groups/${groupId}/add-member`, { userId }),
  removeMember: (groupId, userId) => apiClient.post(`/groups/${groupId}/remove-member`, { userId }),
  leaveGroup: (groupId) => apiClient.post(`/groups/${groupId}/leave`),
  deleteGroup: (groupId) => apiClient.delete(`/groups/${groupId}`),
  getGroupMessages: (groupId) => apiClient.get(`/groups/${groupId}/messages`)
};

export default apiClient;

import axios from 'axios';

// ✅ Fix
const API = axios.create({ baseURL: 'http://localhost:5000/api' });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmfusion_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('farmfusion_token');
      localStorage.removeItem('farmfusion_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login:    (data) => API.post('/auth/login', data),
  getMe:    ()     => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
};

export const animalsAPI = {
  getAll:  (params) => API.get('/animals', { params }),
  getOne:  (id)     => API.get(`/animals/${id}`),
  create:  (data)   => API.post('/animals', data),
  update:  (id, data) => API.put(`/animals/${id}`, data),
  delete:  (id)     => API.delete(`/animals/${id}`),
};

export const breedingAPI = {
  getAll: ()         => API.get('/breeding'),
  create: (data)     => API.post('/breeding', data),
  update: (id, data) => API.put(`/breeding/${id}`, data),
  delete: (id)       => API.delete(`/breeding/${id}`),
};

export const feedingAPI = {
  getAll: (params) => API.get('/feeding', { params }),
  create: (data)   => API.post('/feeding', data),
  delete: (id)     => API.delete(`/feeding/${id}`),
};

export const installmentsAPI = {
  getAll:  ()         => API.get('/installments'),
  create:  (data)     => API.post('/installments', data),
  pay:     (id, data) => API.post(`/installments/${id}/pay`, data),
  delete:  (id)       => API.delete(`/installments/${id}`),
};

export const vouchersAPI = {
  getAll:  (params) => API.get('/vouchers', { params }),
  create:  (data)   => API.post('/vouchers', data),
  delete:  (id)     => API.delete(`/vouchers/${id}`),
};

export const progressAPI = {
  getAll:  (params) => API.get('/progress', { params }),
  create:  (data)   => API.post('/progress', data),
};

export const cattleAPI = {
  getAll:  (params) => API.get('/cattle', { params }),
  create:  (data)   => API.post('/cattle', data),
  buy:     (id)     => API.post(`/cattle/${id}/buy`),
};

export default API;
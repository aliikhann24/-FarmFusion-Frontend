import axios from 'axios';

const API = axios.create({
  baseURL: 'https://farmfusion-backend-production-3510.up.railway.app/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmfusion_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('farmfusion_token');

      // ✅ Don't logout on auth routes themselves
      const isAuthRoute = error.config?.url?.includes('/auth/login') ||
                          error.config?.url?.includes('/auth/register');

      // ✅ Don't logout on background polling routes
      const isPollingRoute = error.config?.url?.includes('/enquiries/sent') ||
                             error.config?.url?.includes('/enquiries/received');

      // ✅ Don't logout on the /auth/me validation call
      // (AuthContext handles that itself)
      const isGetMe = error.config?.url?.includes('/auth/me');

      if (token && !isAuthRoute && !isPollingRoute && !isGetMe) {
        localStorage.removeItem('farmfusion_token');
        localStorage.removeItem('farmfusion_user');
        localStorage.removeItem('farmfusion_enquiry_statuses');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register:       (data) => API.post('/auth/register', data),
  login:          (data) => API.post('/auth/login', data),
  getMe:          ()     => API.get('/auth/me'),
  updateProfile:  (data) => API.put('/auth/profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
};

export const animalsAPI = {
  getAll:  (params)   => API.get('/animals', { params }),
  getOne:  (id)       => API.get(`/animals/${id}`),
  create:  (data)     => API.post('/animals', data),
  update:  (id, data) => API.put(`/animals/${id}`, data),
  delete:  (id)       => API.delete(`/animals/${id}`),
};

export const breedingAPI = {
  getAll: ()           => API.get('/breeding'),
  create: (data)       => API.post('/breeding', data),
  update: (id, data)   => API.put(`/breeding/${id}`, data),
  delete: (id)         => API.delete(`/breeding/${id}`),
};

export const feedingAPI = {
  getAll:  (params)   => API.get('/feeding', { params }),
  create:  (data)     => API.post('/feeding', data),
  update:  (id, data) => API.put(`/feeding/${id}`, data),
  delete:  (id)       => API.delete(`/feeding/${id}`),
};

export const cattleAPI = {
  getAll:  (params)   => API.get('/cattle', { params }),
  create:  (data)     => API.post('/cattle', data),
  update:  (id, data) => API.put(`/cattle/${id}`, data),
  delete:  (id)       => API.delete(`/cattle/${id}`),
  buy:     (id)       => API.post(`/cattle/${id}/buy`),
};

export const vouchersAPI = {
  getAll:  (params)   => API.get('/vouchers', { params }),
  create:  (data)     => API.post('/vouchers', data),
  update:  (id, data) => API.put(`/vouchers/${id}`, data),
  delete:  (id)       => API.delete(`/vouchers/${id}`),
};

export const installmentsAPI = {
  getAll:  ()           => API.get('/installments'),
  create:  (data)       => API.post('/installments', data),
  update:  (id, data)   => API.put(`/installments/${id}`, data),
  pay:     (id, data)   => API.post(`/installments/${id}/pay`, data),
  delete:  (id)         => API.delete(`/installments/${id}`),
};

export const progressAPI = {
  getAll:  (params)   => API.get('/progress', { params }),
  create:  (data)     => API.post('/progress', data),
  update:  (id, data) => API.put(`/progress/${id}`, data),
  delete:  (id)       => API.delete(`/progress/${id}`),
};

export const enquiryAPI = {
  submit:     (data)       => API.post('/enquiries', data),
  received:   ()           => API.get('/enquiries/received'),
  sent:       ()           => API.get('/enquiries/sent'),
  update:     (id, status) => API.patch(`/enquiries/${id}/status`, { status }),
  delete:     (id)         => API.delete(`/enquiries/${id}`),
  deleteSent: (id)         => API.delete(`/enquiries/sent/${id}`),
};

export const vaccinationAPI = {
  getAll:  (params)   => API.get('/vaccinations', { params }),
  create:  (data)     => API.post('/vaccinations', data),
  update:  (id, data) => API.put(`/vaccinations/${id}`, data),
  delete:  (id)       => API.delete(`/vaccinations/${id}`),
};

export default API;
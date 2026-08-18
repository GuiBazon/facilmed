import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const medicos = {
  getAll: () => api.get('/medicos'),
  getById: (id) => api.get(`/medicos/${id}`),
  getHorarios: (id) => api.get(`/medicos/${id}/horarios`),
  addHorario: (id, data) => api.post(`/medicos/${id}/horarios`, data),
};

export const especialidades = {
  getAll: () => api.get('/especialidades'),
};

export const agendamentos = {
  getAgenda: (params) => api.get('/medico/agenda', { params }),
  atualizarAtendimento: (id, data) => api.put(`/medico/atendimento/${id}`, data),
};

export default api;

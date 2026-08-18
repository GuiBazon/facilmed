import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.89.240.66:3000/api'; // Use 'http://localhost:3000/api' if running on a web browser or emulator that supports localhost

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const especialidades = {
  getAll: () => api.get('/especialidades'),
  getMedicos: (id) => api.get(`/especialidades/${id}/medicos`),
};

export const medicos = {
  getAll: () => api.get('/medicos'),
  getById: (id) => api.get(`/medicos/${id}`),
  getHorarios: (id) => api.get(`/medicos/${id}/horarios`),
  getDisponibilidade: (id, data) => api.get(`/medicos/${id}/disponibilidade`, { params: { data } }),
};

export const agendamentos = {
  create: (data) => api.post('/agendamentos', data),
  getPorPaciente: () => api.get('/agendamentos/paciente'),
  cancelar: (id) => api.put(`/agendamentos/${id}/cancelar`),
};

export const filaEspera = {
  inscrever: (data) => api.post('/fila-espera', data),
  getFila: (medicoId, data) => api.get(`/fila-espera/medico/${medicoId}/data/${data}`),
  confirmar: (id) => api.put(`/fila-espera/${id}/confirmar`),
};

export const chat = {
  enviar: (messages, paciente_id) => api.post('/chat', { messages, paciente_id }),
};

export const medico = {
  getAgenda: (params) => api.get('/medico/agenda', { params }),
  atualizarAtendimento: (id, data) => api.put(`/medico/atendimento/${id}`, data),
};

export const usuarios = {
  getPerfil: () => api.get('/usuarios/me'),
  atualizarInterface: (tipo_interface) => api.put('/usuarios/interface', { tipo_interface }),
};

export default api;

import { Platform } from 'react-native';

// No emulador Android usa 10.0.2.2, na web/iOS usa localhost
const API_BASE = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  default: 'http://localhost:5000/api'
});

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const api = {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.mensagem || data.error || 'Erro na requisição');
      }
      return data;
    } catch (err) {
      throw err;
    }
  },

  login: (cpf, senha) => api.request('/auth/login', { method: 'POST', body: JSON.stringify({ cpf, senha }) }),
  register: (data) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  updatePreferencias: (tipo_interface) => api.request('/auth/preferencias', { method: 'PUT', body: JSON.stringify({ tipo_interface }) }),
  
  getEspecialidades: () => api.request('/especialidades'),
  getMedicos: (especialidadeId) => api.request(`/medicos${especialidadeId ? `?especialidade_id=${especialidadeId}` : ''}`),
  getDisponibilidade: (medicoId, data) => api.request(`/medicos/${medicoId}/disponibilidade?data=${data}`),
  
  criarAgendamento: (data) => api.request('/agendamentos', { method: 'POST', body: JSON.stringify(data) }),
  getAgendamentos: (pacienteId) => api.request(`/agendamentos${pacienteId ? `?paciente_id=${pacienteId}` : ''}`),
  cancelarAgendamento: (id) => api.request(`/agendamentos/${id}/cancelar`, { method: 'PUT' }),

  entrarFilaEspera: (medicoId, dataDesejada, pacienteId) => api.request('/fila-espera', {
    method: 'POST',
    body: JSON.stringify({ medico_id: medicoId, data_desejada: dataDesejada, paciente_id: pacienteId })
  }),

  enviarChat: (mensagem, historico, pacienteId) => api.request('/chat', {
    method: 'POST',
    body: JSON.stringify({ mensagem, historico, paciente_id: pacienteId })
  })
};

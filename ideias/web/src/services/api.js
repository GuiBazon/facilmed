const API_BASE = 'http://localhost:5000/api';

export const authService = {
  getToken() {
    return localStorage.getItem('facilmed_token');
  },
  getUser() {
    const raw = localStorage.getItem('facilmed_user');
    return raw ? JSON.parse(raw) : null;
  },
  setAuth(token, user) {
    localStorage.setItem('facilmed_token', token);
    localStorage.setItem('facilmed_user', JSON.stringify(user));
  },
  clearAuth() {
    localStorage.removeItem('facilmed_token');
    localStorage.removeItem('facilmed_user');
  }
};

export async function request(endpoint, options = {}) {
  const token = authService.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.mensagem || data.error || 'Erro na requisição');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  login: (cpf, senha) => request('/auth/login', { method: 'POST', body: JSON.stringify({ cpf, senha }) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  updatePreferencias: (tipo_interface) => request('/auth/preferencias', { method: 'PUT', body: JSON.stringify({ tipo_interface }) }),

  // Médicos e Especialidades
  getEspecialidades: () => request('/especialidades'),
  getMedicos: (especialidadeId) => request(`/medicos${especialidadeId ? `?especialidade_id=${especialidadeId}` : ''}`),
  getDisponibilidade: (medicoId, data) => request(`/medicos/${medicoId}/disponibilidade?data=${data}`),

  // Agendamentos
  criarAgendamento: (dados) => request('/agendamentos', { method: 'POST', body: JSON.stringify(dados) }),
  getAgendamentosPaciente: (pacienteId) => request(`/agendamentos${pacienteId ? `?paciente_id=${pacienteId}` : ''}`),
  cancelarAgendamento: (agendamentoId) => request(`/agendamentos/${agendamentoId}/cancelar`, { method: 'PUT' }),

  // Fila de Espera
  entrarFilaEspera: (medicoId, dataDesejada, pacienteId) => request('/fila-espera', {
    method: 'POST',
    body: JSON.stringify({ medico_id: medicoId, data_desejada: dataDesejada, paciente_id: pacienteId })
  }),
  getFilaEspera: () => request('/fila-espera'),
  confirmarVagaFila: (filaId, dados) => request(`/fila-espera/${filaId}/confirmar`, {
    method: 'POST',
    body: JSON.stringify(dados)
  }),

  // Portal do Médico
  getAgendaMedico: () => request('/medico/agenda'),
  salvarProntuario: (agendamentoId, anotacoes_medicas, status = 'CONCLUIDO') => request(`/medico/atendimento/${agendamentoId}`, {
    method: 'PUT',
    body: JSON.stringify({ anotacoes_medicas, status })
  }),

  // Admin
  cadastrarMedico: (dados) => request('/admin/medicos', { method: 'POST', body: JSON.stringify(dados) }),
  configurarGrade: (dados) => request('/admin/horarios', { method: 'POST', body: JSON.stringify(dados) }),

  // Chat com Sofia (Google Gemini)
  enviarMensagemChat: (mensagem, historico, pacienteId) => request('/chat', {
    method: 'POST',
    body: JSON.stringify({ mensagem, historico, paciente_id: pacienteId })
  })
};

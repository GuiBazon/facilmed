const API_BASE_URL = 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    console.error(`Erro API [${endpoint}]:`, error);
    throw error;
  }
}

// Funcoes utilitarias de API
export const api = {
  // Auth
  login: (cpf, senha) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ cpf, senha }) }),
  updateInterface: (userId, tipo_interface) => apiRequest('/auth/interface', { method: 'PUT', body: JSON.stringify({ userId, tipo_interface }) }),
  getUsers: () => apiRequest('/auth/users'),

  // Medicos e Especialidades
  getEspecialidades: () => apiRequest('/especialidades'),
  getMedicos: (especialidadeId) => apiRequest(`/medicos${especialidadeId ? `?especialidade_id=${especialidadeId}` : ''}`),
  getHorariosEStatus: (medicoId, data) => apiRequest(`/medicos/horarios?medico_id=${medicoId}&data=${data}`),
  getStatsOcupacao: () => apiRequest('/stats/ocupacao'),
  createMedico: (dados) => apiRequest('/medicos', { method: 'POST', body: JSON.stringify(dados) }),

  // Agendamentos
  getAgendamentos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/agendamentos?${query}`);
  },
  createAgendamento: (dados) => apiRequest('/agendamentos', { method: 'POST', body: JSON.stringify(dados) }),
  cancelarAgendamento: (id) => apiRequest(`/agendamentos/${id}/cancelar`, { method: 'POST' }),
  updateAnotacoesMedicas: (id, anotacoes_medicas, status) => apiRequest(`/agendamentos/${id}/anotacoes`, { method: 'PUT', body: JSON.stringify({ anotacoes_medicas, status }) }),

  // Fila de Espera
  getFilaEspera: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/fila-espera?${query}`);
  },
  entrarFilaEspera: (dados) => apiRequest('/fila-espera', { method: 'POST', body: JSON.stringify(dados) }),
  confirmarFilaVaga: (id, dados) => apiRequest(`/fila-espera/${id}/confirmar`, { method: 'POST', body: JSON.stringify(dados) }),
  processarExpiracaoFila: () => apiRequest('/fila-espera/processar-expiracao', { method: 'POST' }),

  // Relatorios
  getRelatorios: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/relatorios?${query}`);
  },
  createRelatorio: (dados) => apiRequest('/relatorios', { method: 'POST', body: JSON.stringify(dados) }),

  // Chat MedIA IA
  enviarMensagemMedIA: (mensagem, historico, paciente_id) => apiRequest('/chat', { method: 'POST', body: JSON.stringify({ mensagem, historico, paciente_id }) }),
};

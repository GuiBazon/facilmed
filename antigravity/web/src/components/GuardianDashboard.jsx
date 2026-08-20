import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, CheckCircle2, ShieldAlert, XCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function GuardianDashboard({ currentUser }) {
  const [dependentes, setDependentes] = useState([]);
  const [selectedPacienteId, setSelectedPacienteId] = useState(2); // Dona Maria por padrao
  const [agendamentos, setAgendamentos] = useState([]);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    loadDependentes();
  }, [currentUser]);

  useEffect(() => {
    if (selectedPacienteId) {
      loadAgendamentosDependente(selectedPacienteId);
    }
  }, [selectedPacienteId]);

  async function loadDependentes() {
    try {
      // Buscar dependentes vinculados ao responsavel
      const list = await api.getUsers();
      // Filtrar pacientes idosos ou dependentes
      const pacientes = list.filter(u => u.tipo_usuario === 'PACIENTE');
      setDependentes(pacientes);
      if (pacientes.length > 0) {
        setSelectedPacienteId(pacientes.find(p => p.cpf === '222.222.222-22')?.id || pacientes[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadAgendamentosDependente(pacienteId) {
    try {
      const list = await api.getAgendamentos({ paciente_id: pacienteId });
      setAgendamentos(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleConfirmarPresenca(agendamentoId) {
    setFeedbackMsg('');
    try {
      await api.enviarMensagemMedIA(`Confirmar presença na consulta ${agendamentoId}`, [], currentUser?.id || 3);
      setFeedbackMsg('Presença confirmada com sucesso em nome do dependente!');
      loadAgendamentosDependente(selectedPacienteId);
    } catch (e) {
      setFeedbackMsg('Erro ao confirmar presença: ' + e.message);
    }
  }

  async function handleCancelar(agendamentoId) {
    setFeedbackMsg('');
    try {
      await api.cancelarAgendamento(agendamentoId);
      setFeedbackMsg('Consulta cancelada com sucesso pelo responsável.');
      loadAgendamentosDependente(selectedPacienteId);
    } catch (e) {
      setFeedbackMsg('Erro ao cancelar: ' + e.message);
    }
  }

  const pacienteAtual = dependentes.find(p => p.id === selectedPacienteId);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px 40px 16px' }}>

      {/* CABEÇALHO DO RESPONSÁVEL */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color="var(--accent-primary)" /> Perfil do Responsável / Acompanhante
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Você está gerenciando o acompanhamento médico de familiares e dependentes autorizados.
          </p>
        </div>

        {/* SELEÇÃO DO DEPENDENTE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Acompanhar Paciente:</label>
          <select
            value={selectedPacienteId}
            onChange={(e) => setSelectedPacienteId(parseInt(e.target.value))}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {dependentes.map(d => (
              <option key={d.id} value={d.id}>
                {d.nome} ({d.tipo_interface === 'SIMPLIFICADO' ? 'Idoso/Sênior' : 'Paciente'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedbackMsg && (
        <div className="badge badge-success" style={{ width: '100%', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '15px' }}>
          {feedbackMsg}
        </div>
      )}

      {/* CARDS DE MONITORAMENTO DO DEPENDENTE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', margin: 0 }}>
            Consultas de {pacienteAtual?.nome || 'Dependente'}
          </h3>
          <span className="badge badge-success">
            Permissões Ativas: Visualizar, Confirmar, Reagendar e Cancelar
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {agendamentos.map(a => (
            <div key={a.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{a.medico_nome}</div>
                <div style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>{a.especialidade_nome}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} /> Data/Hora: <strong>{a.data_hora}</strong> ({a.tipo_pagamento})
                </div>
                <div style={{ fontSize: '13px', color: a.confirmado_paciente ? 'var(--emerald-success)' : 'var(--amber-warning)', marginTop: '4px' }}>
                  {a.confirmado_paciente ? '✅ Presença Confirmada pelo Responsável' : '⚠️ Pendente de Confirmação de Presença'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!a.confirmado_paciente && a.status === 'AGENDADO' && (
                  <button onClick={() => handleConfirmarPresenca(a.id)} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                    <CheckCircle2 size={16} /> Confirmar Presença
                  </button>
                )}

                {a.status === 'AGENDADO' && (
                  <button onClick={() => handleCancelar(a.id)} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--rose-danger)' }}>
                    <XCircle size={16} /> Cancelar (RN01)
                  </button>
                )}
              </div>
            </div>
          ))}

          {agendamentos.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Este dependente não possui consultas registradas no momento.</p>
          )}
        </div>
      </div>

    </div>
  );
}

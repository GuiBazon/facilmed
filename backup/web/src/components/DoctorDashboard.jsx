import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, FileText, CheckCircle, Plus, Stethoscope } from 'lucide-react';
import { api } from '../services/api';

export default function DoctorDashboard({ currentUser }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAgendamento, setSelectedAgendamento] = useState(null);
  const [resumo, setResumo] = useState('');
  const [receita, setReceita] = useState('');
  const [exames, setExames] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    loadAgenda();
  }, [selectedDate, currentUser]);

  async function loadAgenda() {
    try {
      // Buscar agendamentos para o medico logado ou medico ID 1 por padrao
      const medicoId = currentUser?.medico_id || 1;
      const list = await api.getAgendamentos({ medico_id: medicoId, data: selectedDate });
      setAgendamentos(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSalvarProntuario(e) {
    e.preventDefault();
    setFeedbackMsg('');
    try {
      await api.createRelatorio({
        agendamento_id: selectedAgendamento.id,
        paciente_id: selectedAgendamento.paciente_id,
        medico_id: selectedAgendamento.medico_id,
        data_atendimento: selectedDate,
        resumo,
        receita,
        exames_solicitados: exames,
        observacoes
      });

      setFeedbackMsg('Prontuário e evolução da consulta salvos com sucesso!');
      setSelectedAgendamento(null);
      setResumo('');
      setReceita('');
      setExames('');
      setObservacoes('');
      loadAgenda();
    } catch (err) {
      setFeedbackMsg('Erro ao salvar prontuário: ' + err.message);
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px 40px 16px' }}>

      {/* CABEÇALHO DO PAINEL DO MÉDICO */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Stethoscope color="var(--accent-primary)" /> Agenda Médica & Prontuário Eletrônico
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Bem-vindo(a), {currentUser?.nome || 'Dra. Ana Paula Arcuri'}. Acompanhe e registre os atendimentos do dia.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Data da Agenda:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      {feedbackMsg && (
        <div className="badge badge-success" style={{ width: '100%', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '15px' }}>
          {feedbackMsg}
        </div>
      )}

      {/* LISTA DE PACIENTES DO DIA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Pacientes Agendados ({agendamentos.length})</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agendamentos.map(a => (
              <div
                key={a.id}
                onClick={() => setSelectedAgendamento(a)}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  border: selectedAgendamento?.id === a.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: selectedAgendamento?.id === a.id ? 'var(--bg-secondary)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{a.paciente_nome}</div>
                  <span className={`badge ${a.status === 'CONCLUIDO' ? 'badge-success' : 'badge-warning'}`}>
                    {a.status}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  CPF: {a.paciente_cpf} | {a.tipo_pagamento} {a.carteirinha_convenio ? `(${a.carteirinha_convenio})` : ''}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--accent-primary)', marginTop: '6px', fontWeight: '600' }}>
                  🕒 Horário: {a.data_hora.split(' ')[1]}
                </div>
              </div>
            ))}

            {agendamentos.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhum paciente agendado para esta data.</p>
            )}
          </div>
        </div>

        {/* PRONTUÁRIO / EVOLUÇÃO MÉDICA */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText color="var(--emerald-success)" /> Registro de Prontuário Médico
          </h3>

          {selectedAgendamento ? (
            <form onSubmit={handleSalvarProntuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', fontSize: '14px' }}>
                <strong>Paciente:</strong> {selectedAgendamento.paciente_nome} <br />
                <strong>Atendimento:</strong> {selectedAgendamento.data_hora}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Resumo / Queixa Principal *:</label>
                <input
                  type="text"
                  required
                  value={resumo}
                  onChange={(e) => setResumo(e.target.value)}
                  placeholder="Ex: Consulta de rotina / dor nas articulações"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Receita / Medicamentos Prescritos:</label>
                <textarea
                  rows={2}
                  value={receita}
                  onChange={(e) => setReceita(e.target.value)}
                  placeholder="Ex: Paracetamol 750mg de 8h em 8h por 3 dias"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Exames Solicitados:</label>
                <input
                  type="text"
                  value={exames}
                  onChange={(e) => setExames(e.target.value)}
                  placeholder="Ex: Hemograma completo, Raio-X"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
                <CheckCircle size={18} /> Salvar Prontuário e Finalizar Atendimento
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              👈 Clique em um paciente da lista ao lado para registrar o prontuário.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

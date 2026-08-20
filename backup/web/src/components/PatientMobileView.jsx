import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Stethoscope, CreditCard, ShieldAlert, CheckCircle2, FileText, Bot, User, ChevronRight, XCircle } from 'lucide-react';
import SeniorAccessibilityMode from './SeniorAccessibilityMode';
import { api } from '../services/api';

export default function PatientMobileView({ currentUser, interfaceMode, onOpenMedIAChat }) {
  if (interfaceMode === 'SIMPLIFICADO') {
    return <SeniorAccessibilityMode currentUser={currentUser} onOpenMedIAChat={onOpenMedIAChat} />;
  }

  const [activeTab, setActiveTab] = useState('agendar'); // 'agendar' | 'minhas_consultas' | 'relatorios'
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [selectedEsp, setSelectedEsp] = useState(null);
  const [selectedMedico, setSelectedMedico] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [horariosData, setHorariosData] = useState({ status_dia: '', horarios: [] });
  const [selectedHora, setSelectedHora] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('PARTICULAR');
  const [carteirinha, setCarteirinha] = useState('');
  const [agendamentos, setAgendamentos] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });
  const [posicaoFila, setPosicaoFila] = useState(null);

  useEffect(() => {
    loadEspecialidades();
    loadMinhasConsultas();
    loadRelatorios();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, [currentUser]);

  async function loadEspecialidades() {
    try {
      const list = await api.getEspecialidades();
      setEspecialidades(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadMinhasConsultas() {
    try {
      const list = await api.getAgendamentos({ paciente_id: currentUser?.id || 1 });
      setAgendamentos(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadRelatorios() {
    try {
      const list = await api.getRelatorios({ paciente_id: currentUser?.id || 1 });
      setRelatorios(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSelectEspecialidade(esp) {
    setSelectedEsp(esp);
    setSelectedMedico(null);
    setSelectedHora('');
    try {
      const list = await api.getMedicos(esp.id);
      setMedicos(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSelectMedico(medico) {
    setSelectedMedico(medico);
    setSelectedHora('');
    loadHorarios(medico.id, selectedDate);
  }

  async function loadHorarios(medicoId, data) {
    try {
      const res = await api.getHorariosEStatus(medicoId, data);
      setHorariosData(res);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleConfirmBooking() {
    setFeedback({ type: '', msg: '' });
    try {
      const dataHoraStr = `${selectedDate} ${selectedHora}:00`;
      const res = await api.createAgendamento({
        paciente_id: currentUser?.id || 1,
        medico_id: selectedMedico.id,
        data_hora: dataHoraStr,
        tipo_pagamento: tipoPagamento,
        carteirinha_convenio: tipoPagamento === 'CONVENIO' ? carteirinha : null
      });

      setFeedback({ type: 'success', msg: `Consulta agendada com sucesso com ${selectedMedico.nome} para ${dataHoraStr}!` });
      setSelectedHora('');
      loadMinhasConsultas();
      setActiveTab('minhas_consultas');
    } catch (err) {
      setFeedback({ type: 'danger', msg: err.message || 'Erro ao realizar agendamento (RN03 Conflito de Horários).' });
    }
  }

  async function handleCancelarConsulta(agendamentoId) {
    setFeedback({ type: '', msg: '' });
    try {
      await api.cancelarAgendamento(agendamentoId);
      setFeedback({ type: 'success', msg: 'Consulta cancelada com sucesso.' });
      loadMinhasConsultas();
    } catch (err) {
      setFeedback({ type: 'danger', msg: err.message || 'Bloqueio de cancelamento.' });
    }
  }

  async function handleEntrarFilaEspera() {
    try {
      const res = await api.entrarFilaEspera({
        paciente_id: currentUser?.id || 1,
        medico_id: selectedMedico.id,
        data_desejada: selectedDate
      });
      setPosicaoFila(res.posicao_fila);
      setFeedback({ type: 'success', msg: `Você entrou na Fila de Espera Dinâmica (RN02)! Sua posição atual é #${res.posicao_fila}. Se alguém cancelar nesta data, você será notificado em 1h!` });
    } catch (err) {
      setFeedback({ type: 'danger', msg: err.message });
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px 40px 16px' }}>

      {/* BANNER ASSISTENTE VIRTUAL MEDIA */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(16, 185, 129, 0.15))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--accent-primary)', color: '#fff', padding: '14px', borderRadius: '16px', display: 'flex' }}>
            <Bot size={32} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Secretária Virtual MedIA (IA Autônoma)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Precisa agendar ou cancelar rapidamente? Fale com a MedIA via Chat inteligente!
            </p>
          </div>
        </div>
        <button onClick={onOpenMedIAChat} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
          💬 Abrir Chat com MedIA
        </button>
      </div>

      {/* FEEDBACK SYSTEM ALERTS */}
      {feedback.msg && (
        <div className={`badge badge-${feedback.type}`} style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', fontSize: '15px', marginBottom: '24px', justifyContent: 'flex-start' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
          {feedback.msg}
        </div>
      )}

      {/* ABAS DO PORTAL */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('agendar')}
          className={`btn ${activeTab === 'agendar' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Stethoscope size={18} /> Novo Agendamento
        </button>
        <button
          onClick={() => setActiveTab('minhas_consultas')}
          className={`btn ${activeTab === 'minhas_consultas' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <CalendarIcon size={18} /> Minhas Consultas ({agendamentos.length})
        </button>
        <button
          onClick={() => setActiveTab('relatorios')}
          className={`btn ${activeTab === 'relatorios' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FileText size={18} /> Prontuários & Exames ({relatorios.length})
        </button>
      </div>

      {/* TAB 1: AGENDAR CONSULTA */}
      {activeTab === 'agendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          {/* PASSO 1: ESPECIALIDADES */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--accent-primary)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>1</span>
              Selecione a Especialidade
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {especialidades.map(esp => (
                <button
                  key={esp.id}
                  onClick={() => handleSelectEspecialidade(esp)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: selectedEsp?.id === esp.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: selectedEsp?.id === esp.id ? 'var(--accent-glow)' : 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600' }}>{esp.nome}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{esp.descricao}</div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </div>

          {/* PASSO 2: MÉDICOS E CALENDÁRIO */}
          {selectedEsp && (
            <div className="glass-panel fade-in" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--accent-primary)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>2</span>
                Médicos & Data
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Profissional:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {medicos.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMedico(m)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: selectedMedico?.id === m.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: selectedMedico?.id === m.id ? 'var(--bg-secondary)' : 'transparent',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>{m.nome}</div>
                      <div style={{ fontSize: '12px', color: 'var(--emerald-success)' }}>Valor: R$ {m.valor_consulta.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMedico && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Selecione a Data:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      loadHorarios(selectedMedico.id, e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '15px'
                    }}
                  />

                  {/* Status do Dia */}
                  <div style={{ marginTop: '12px' }}>
                    {horariosData.status_dia === 'LOTADO' && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid var(--amber-warning)', padding: '12px', borderRadius: '10px' }}>
                        <p style={{ color: 'var(--amber-warning)', fontSize: '13px', margin: 0, fontWeight: '600' }}>
                          ⚠️ Este dia está totalmente lotado! Deseja entrar na Fila de Espera Sequencial (RN02)?
                        </p>
                        <button onClick={handleEntrarFilaEspera} className="btn btn-secondary" style={{ marginTop: '8px', padding: '6px 12px', fontSize: '12px', width: '100%' }}>
                          🙋‍♂️ Entrar na Fila de Espera ({posicaoFila ? `Posição #${posicaoFila}` : 'Entrar Agora'})
                        </button>
                      </div>
                    )}
                    {horariosData.status_dia === 'DISPONIVEL' && (
                      <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center' }}>
                        Vagas disponíveis para este dia ({horariosData.vagas_livres} horários livres)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 3: HORÁRIO E PAGAMENTO */}
          {selectedMedico && selectedDate && (
            <div className="glass-panel fade-in" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'var(--accent-primary)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>3</span>
                Horário & Tipo de Atendimento
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Horários Livres:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                  {horariosData.horarios?.filter(h => h.disponivel).map(h => (
                    <button
                      key={h.hora}
                      onClick={() => setSelectedHora(h.hora)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: selectedHora === h.hora ? '2px solid var(--emerald-success)' : '1px solid var(--border-color)',
                        background: selectedHora === h.hora ? 'var(--emerald-glow)' : 'var(--bg-glass)',
                        color: 'var(--text-primary)',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {h.hora}
                    </button>
                  ))}
                </div>
              </div>

              {selectedHora && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Modalidade de Pagamento:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setTipoPagamento('PARTICULAR')}
                        className={`btn ${tipoPagamento === 'PARTICULAR' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '10px' }}
                      >
                        Particular
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoPagamento('CONVENIO')}
                        className={`btn ${tipoPagamento === 'CONVENIO' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '10px' }}
                      >
                        Convênio
                      </button>
                    </div>
                  </div>

                  {tipoPagamento === 'CONVENIO' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Número da Carteirinha:</label>
                      <input
                        type="text"
                        value={carteirinha}
                        onChange={(e) => setCarteirinha(e.target.value)}
                        placeholder="Ex: BRADESCO-987654"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}

                  <button onClick={handleConfirmBooking} className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '10px' }}>
                    Confirmar Agendamento
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MINHAS CONSULTAS */}
      {activeTab === 'minhas_consultas' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Minhas Consultas Agendadas</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {agendamentos.map(a => (
              <div key={a.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{a.medico_nome}</div>
                  <div style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>{a.especialidade_nome}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> {a.data_hora} ({a.tipo_pagamento})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge ${a.status === 'AGENDADO' ? 'badge-success' : a.status === 'CANCELADO' ? 'badge-danger' : 'badge-warning'}`}>
                    {a.status}
                  </span>

                  {a.status === 'AGENDADO' && (
                    <button onClick={() => handleCancelarConsulta(a.id)} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--rose-danger)' }}>
                      <XCircle size={16} /> Cancelar (RN01)
                    </button>
                  )}
                </div>
              </div>
            ))}

            {agendamentos.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Você ainda não tem consultas agendadas.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRONTUÁRIOS E RELATÓRIOS MÉDICOS */}
      {activeTab === 'relatorios' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Prontuários e Registros Médicos</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {relatorios.map(r => (
              <div key={r.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', margin: 0 }}>{r.resumo}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--accent-primary)', margin: '2px 0 0 0' }}>{r.medico_nome} ({r.especialidade_nome})</p>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Data: {r.data_atendimento}</div>
                </div>

                {r.receita && (
                  <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', marginBottom: '8px', fontSize: '14px' }}>
                    <strong>💊 Receita Médica:</strong> {r.receita}
                  </div>
                )}
                {r.exames_solicitados && (
                  <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', marginBottom: '8px', fontSize: '14px' }}>
                    <strong>🔬 Exames Solicitados:</strong> {r.exames_solicitados}
                  </div>
                )}
              </div>
            ))}

            {relatorios.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Nenhum relatório médico registrado até o momento.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

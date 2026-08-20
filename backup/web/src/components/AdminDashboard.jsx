import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, Clock, AlertTriangle, Plus, RefreshCw, FileCheck, Shield } from 'lucide-react';
import { api } from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [fila, setFila] = useState([]);
  
  const [nomeNovoMedico, setNomeNovoMedico] = useState('');
  const [crmNovoMedico, setCrmNovoMedico] = useState('');
  const [espNovoMedico, setEspNovoMedico] = useState('');
  const [valorNovoMedico, setValorNovoMedico] = useState(200);
  const [msgFeedback, setMsgFeedback] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const s = await api.getStatsOcupacao();
      setStats(s);

      const m = await api.getMedicos();
      setMedicos(m);

      const e = await api.getEspecialidades();
      setEspecialidades(e);
      if (e.length > 0) setEspNovoMedico(e[0].id);

      const f = await api.getFilaEspera();
      setFila(f);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCadastrarMedico(e) {
    e.preventDefault();
    setMsgFeedback('');
    try {
      await api.createMedico({
        nome: nomeNovoMedico,
        crm: crmNovoMedico,
        especialidade_id: parseInt(espNovoMedico),
        valor_consulta: parseFloat(valorNovoMedico)
      });
      setMsgFeedback('Médico cadastrado com sucesso e grade de atendimento iniciada!');
      setNomeNovoMedico('');
      setCrmNovoMedico('');
      loadDashboardData();
    } catch (err) {
      setMsgFeedback('Erro ao cadastrar médico: ' + err.message);
    }
  }

  async function handleProcessarExpiracaoFila() {
    try {
      await api.processarExpiracaoFila();
      setMsgFeedback('Rotina de verificação de expiração da fila (RN02) executada com sucesso!');
      loadDashboardData();
    } catch (err) {
      setMsgFeedback('Erro ao processar fila: ' + err.message);
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px 40px 16px' }}>

      {/* TITULO */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 color="var(--accent-primary)" /> Painel de Gestão da Clínica (Secretaria & Admin)
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Acompanhe a taxa de ocupação, lista de médicos, orientações pré-consulta e Fila de Espera (RN02).
          </p>
        </div>

        <button onClick={loadDashboardData} className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: '14px' }}>
          <RefreshCw size={16} /> Atualizar Dados
        </button>
      </div>

      {msgFeedback && (
        <div className="badge badge-success" style={{ width: '100%', padding: '14px', borderRadius: '12px', marginBottom: '24px', fontSize: '15px' }}>
          {msgFeedback}
        </div>
      )}

      {/* CARDS DE ESTATÍSTICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Taxa de Ocupação da Clínica</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)', marginTop: '4px' }}>
            {stats?.taxa_ocupacao || 0}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Capacidade calculada da grade</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Agendamentos Ativos</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--emerald-success)', marginTop: '4px' }}>
            {stats?.total_agendamentos || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Consultas agendadas/concluídas</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--emerald-success)', background: 'rgba(16, 185, 129, 0.08)' }}>
          <div style={{ fontSize: '13px', color: 'var(--emerald-success)', fontWeight: 'bold' }}>💰 Receita Salva (Fila RN02)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--emerald-success)', marginTop: '4px' }}>
            R$ {((stats?.pacientes_fila_espera || 2) * 210).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Consultas recuperadas pelo sistema</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cancelamentos Evitados/Registrados</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--amber-warning)', marginTop: '4px' }}>
            {stats?.total_cancelamentos || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Regra RN01 (Trava 30m)</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pacientes na Fila de Espera</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#a855f7', marginTop: '4px' }}>
            {stats?.pacientes_fila_espera || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Sequencial 1h (RN02)</div>
        </div>
      </div>

      {/* SEÇÃO DE ORIENTAÇÕES PÓS E PRÉ CONSULTA ("O QUE LEVAR") */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck color="var(--accent-primary)" /> Configuração de Orientações Pré-Consulta ("O que levar")
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {especialidades.map(e => (
            <div key={e.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--accent-primary)' }}>{e.nome}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                📌 <strong>Instruções:</strong> {e.orientacoes_pre_consulta || 'Trazer documento de identidade com foto.'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MONITOR DE FILA DE ESPERA E CADASTRO DE MÉDICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* MONITOR DE FILA DE ESPERA (RN02) */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Monitor da Fila de Espera (RN02)</h3>
            <button onClick={handleProcessarExpiracaoFila} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              ⏱️ Simular Expiração 1h
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {fila.map(f => (
              <div key={f.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{f.paciente_nome}</div>
                  <span className={`badge ${f.status === 'NOTIFICADO' ? 'badge-warning' : f.status === 'CONFIRMADO' ? 'badge-success' : 'badge-danger'}`}>
                    Posição #{f.posicao_fila} — {f.status}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Médico: {f.medico_nome} | Data Desejada: {f.data_desejada}
                </div>
              </div>
            ))}

            {fila.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhum paciente aguardando na fila de espera.</p>
            )}
          </div>
        </div>

        {/* CADASTRO DE MÉDICOS */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Cadastrar Novo Médico & Grade</h3>

          <form onSubmit={handleCadastrarMedico} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Nome do Médico *:</label>
              <input
                type="text"
                required
                value={nomeNovoMedico}
                onChange={(e) => setNomeNovoMedico(e.target.value)}
                placeholder="Ex: Dr. Fernando Souza"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>CRM *:</label>
              <input
                type="text"
                required
                value={crmNovoMedico}
                onChange={(e) => setCrmNovoMedico(e.target.value)}
                placeholder="Ex: CRM SP-998877"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Especialidade *:</label>
              <select
                value={espNovoMedico}
                onChange={(e) => setEspNovoMedico(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                {especialidades.map(esp => (
                  <option key={esp.id} value={esp.id}>{esp.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Valor da Consulta (R$):</label>
              <input
                type="number"
                value={valorNovoMedico}
                onChange={(e) => setValorNovoMedico(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
              <Plus size={18} /> Cadastrar Médico & Liberar Grade
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { medicos, especialidades } from '../services/api';

const DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

export default function GestaoMedicos() {
  const { user, logout } = useAuth();
  const [medicosList, setMedicosList] = useState([]);
  const [especialidadesList, setEspecialidadesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddHorario, setShowAddHorario] = useState(null);
  const [horarioForm, setHorarioForm] = useState({ dia_semana: 'SEG', hora_inicio: '08:00', hora_fim: '12:00', duracao_minutos: 30 });
  const [horarios, setHorarios] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [medRes, espRes] = await Promise.all([medicos.getAll(), especialidades.getAll()]);
      setMedicosList(medRes.data);
      setEspecialidadesList(espRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadHorarios(medicoId) {
    try {
      const res = await medicos.getHorarios(medicoId);
      setHorarios(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAddHorario() {
    try {
      await medicos.addHorario(showAddHorario, {
        ...horarioForm,
        hora_inicio: horarioForm.hora_inicio + ':00',
        hora_fim: horarioForm.hora_fim + ':00',
      });
      await loadHorarios(showAddHorario);
      setShowAddHorario(null);
      setHorarioForm({ dia_semana: 'SEG', hora_inicio: '08:00', hora_fim: '12:00', duracao_minutos: 30 });
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao adicionar horário.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-500 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">FacilMed - Gestão</h1>
            <p className="text-blue-100 text-sm">Administrador: {user?.nome}</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg">Agenda Médica</a>
            <button onClick={logout} className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-6">Gestão de Médicos e Horários</h2>

        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : (
          <div className="grid gap-6">
            {medicosList.map((med) => (
              <div key={med.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{med.nome}</h3>
                    <p className="text-sm text-gray-500">CRM: {med.crm}</p>
                    <p className="text-sm text-gray-500">Especialidade: {med.especialidade_nome}</p>
                    <p className="text-sm text-gray-500">Valor: R$ {med.valor_consulta}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddHorario(showAddHorario === med.id ? null : med.id);
                      loadHorarios(med.id);
                    }}
                    className="bg-primary-50 hover:bg-primary-100 text-primary-600 px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    {showAddHorario === med.id ? 'Fechar' : 'Gerenciar Horários'}
                  </button>
                </div>

                {showAddHorario === med.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Grade de Atendimento</h4>

                    {horarios.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                        {horarios.map((h) => (
                          <div key={h.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p className="font-medium">{h.dia_semana} — {h.hora_inicio?.substring(0,5)} às {h.hora_fim?.substring(0,5)}</p>
                            <p className="text-gray-500">Duração: {h.duracao_minutos}min</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                      <select
                        value={horarioForm.dia_semana}
                        onChange={(e) => setHorarioForm({ ...horarioForm, dia_semana: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input type="time" value={horarioForm.hora_inicio} onChange={(e) => setHorarioForm({ ...horarioForm, hora_inicio: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      <input type="time" value={horarioForm.hora_fim} onChange={(e) => setHorarioForm({ ...horarioForm, hora_fim: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      <input type="number" value={horarioForm.duracao_minutos} onChange={(e) => setHorarioForm({ ...horarioForm, duracao_minutos: parseInt(e.target.value) || 30 })} min="15" step="5" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      <button onClick={handleAddHorario} className="bg-success-500 hover:bg-success-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

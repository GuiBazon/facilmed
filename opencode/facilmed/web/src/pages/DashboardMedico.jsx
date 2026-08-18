import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { agendamentos } from '../services/api';

export default function DashboardMedico() {
  const { user, logout } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalAnotacoes, setModalAnotacoes] = useState(null);
  const [anotacoes, setAnotacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAgenda();
  }, [selectedDate]);

  async function loadAgenda() {
    setLoading(true);
    try {
      const res = await agendamentos.getAgenda({
        data_inicio: selectedDate,
        data_fim: selectedDate,
      });
      setLista(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarAnotacoes() {
    if (!anotacoes.trim()) return;
    setSaving(true);
    try {
      await agendamentos.atualizarAtendimento(modalAnotacoes.id, { anotacoes_medicas: anotacoes });
      setModalAnotacoes(null);
      setAnotacoes('');
      loadAgenda();
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-500 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">FacilMed - Painel Médico</h1>
            <p className="text-blue-100 text-sm">Dr(a). {user?.nome}</p>
          </div>
          <button onClick={logout} className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700">Agenda do Dia</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-gray-500">Nenhum atendimento para esta data.</p>
        ) : (
          <div className="grid gap-4">
            {lista.map((item) => {
              const dataHora = new Date(item.data_hora);
              const horas = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{horas} - {item.paciente_nome}</p>
                    <p className="text-sm text-gray-500">Telefone: {item.paciente_telefone}</p>
                    <p className="text-sm text-gray-500">Status: <span className={
                      item.status === 'AGENDADO' ? 'text-primary-500 font-medium' :
                      item.status === 'CONCLUIDO' ? 'text-success-500 font-medium' : 'text-gray-400'
                    }>{item.status}</span></p>
                    {item.anotacoes_medicas && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Prontuário:</span> {item.anotacoes_medicas}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'AGENDADO' && (
                      <button
                        onClick={() => { setModalAnotacoes(item); setAnotacoes(item.anotacoes_medicas || ''); }}
                        className="bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Prontuário
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modalAnotacoes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Prontuário - {modalAnotacoes.paciente_nome}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(modalAnotacoes.data_hora).toLocaleString('pt-BR')}
            </p>
            <textarea
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Digite as anotações médicas..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setModalAnotacoes(null); setAnotacoes(''); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarAnotacoes}
                disabled={saving}
                className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar e Concluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search,
  Filter,
  RefreshCw,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import ProntuarioModal from '../components/ProntuarioModal';

export default function MedicoDashboard({ user }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [selectedAgendamento, setSelectedAgendamento] = useState(null);
  const [busca, setBusca] = useState('');

  const loadAgenda = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAgendaMedico();
      setAgendamentos(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar atendimentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
  }, []);

  const filtered = agendamentos.filter((a) => {
    const matchStatus = filtroStatus === 'TODOS' || a.status === filtroStatus;
    const matchBusca = (a.paciente_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
                       (a.paciente_cpf || '').includes(busca);
    return matchStatus && matchBusca;
  });

  const totalHoje = agendamentos.length;
  const concluidos = agendamentos.filter(a => a.status === 'CONCLUIDO').length;
  const pendentes = agendamentos.filter(a => a.status === 'AGENDADO').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header Profile & Metrics */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-teal-200 mb-3">
            <Stethoscope className="w-4 h-4" />
            Painel Clínico Integrado
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Olá, {user?.nome || 'Doutor(a)'}
          </h1>
          <p className="text-sm text-teal-200 mt-1">
            Gestão da agenda de consultas, histórico de pacientes e prontuário eletrônico.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/10">
            <span className="text-2xl font-black text-white">{totalHoje}</span>
            <p className="text-[11px] text-teal-200 font-semibold uppercase tracking-wider mt-0.5">Total</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/10">
            <span className="text-2xl font-black text-amber-300">{pendentes}</span>
            <p className="text-[11px] text-teal-200 font-semibold uppercase tracking-wider mt-0.5">Pendentes</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/10">
            <span className="text-2xl font-black text-emerald-300">{concluidos}</span>
            <p className="text-[11px] text-teal-200 font-semibold uppercase tracking-wider mt-0.5">Atendidos</p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por paciente ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        {/* Status Filters & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['TODOS', 'AGENDADO', 'CONCLUIDO', 'CANCELADO'].map((st) => (
              <button
                key={st}
                onClick={() => setFiltroStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filtroStatus === st ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'TODOS' ? 'Todos' : st === 'AGENDADO' ? 'Agendados' : st === 'CONCLUIDO' ? 'Concluídos' : 'Cancelados'}
              </button>
            ))}
          </div>

          <button
            onClick={loadAgenda}
            title="Recarregar agenda"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Appointments List */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-sm font-medium">Carregando lista de atendimentos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center p-8">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Nenhum atendimento encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não há consultas agendadas que correspondam aos filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const isDone = item.status === 'CONCLUIDO';
            const isCanceled = item.status === 'CANCELADO';
            const dateStr = item.data_hora?.split('T')[0] || item.data_hora?.split(' ')[0];
            const timeStr = item.data_hora?.includes(' ') ? item.data_hora.split(' ')[1]?.substring(0, 5) : '00:00';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Time and Status Badge */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      {timeStr} • {dateStr}
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCanceled
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div className="space-y-1 mb-4">
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{item.paciente_nome}</h3>
                    <p className="text-xs text-slate-500 font-mono">CPF: {item.paciente_cpf}</p>
                    <p className="text-xs text-slate-500">Tel: {item.paciente_telefone || 'Não informado'}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                        {item.tipo_pagamento}
                      </span>
                      {item.carteirinha_convenio && (
                        <span className="text-[11px] text-slate-500">Cart: {item.carteirinha_convenio}</span>
                      )}
                    </div>
                  </div>

                  {/* Medical Notes Snippet */}
                  {item.anotacoes_medicas && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 mb-4">
                      <p className="text-[10px] font-bold text-teal-800 uppercase flex items-center gap-1 mb-1">
                        <FileText className="w-3 h-3" /> Anotações do Prontuário:
                      </p>
                      <p className="text-xs text-slate-700 line-clamp-2 font-mono">{item.anotacoes_medicas}</p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedAgendamento(item)}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <FileText className="w-4 h-4" />
                    {item.anotacoes_medicas ? 'Editar Prontuário' : 'Iniciar Atendimento / Prontuário'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Prontuário */}
      {selectedAgendamento && (
        <ProntuarioModal
          agendamento={selectedAgendamento}
          onClose={() => setSelectedAgendamento(null)}
          onSuccess={loadAgenda}
        />
      )}

    </div>
  );
}

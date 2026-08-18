import React, { useState } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Save, User, Clock, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function ProntuarioModal({ agendamento, onClose, onSuccess }) {
  const [anotacoes, setAnotacoes] = useState(agendamento.anotacoes_medicas || '');
  const [status, setStatus] = useState(agendamento.status || 'CONCLUIDO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!anotacoes.trim()) {
      setError('Por favor, digite as anotações do prontuário antes de salvar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.salvarProntuario(agendamento.id, anotacoes, status);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar anotações do prontuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Prontuário Médico Rápido</h3>
              <p className="text-xs text-teal-200">Atendimento #{agendamento.id} — FácilMed Clinical</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            <div>
              <span className="font-semibold text-slate-800">{agendamento.paciente_nome}</span>
              <p className="text-[11px] text-slate-500">CPF: {agendamento.paciente_cpf}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <div>
              <span className="font-semibold text-slate-800">
                {agendamento.data_hora?.split('T')[0] || agendamento.data_hora?.split(' ')[0]}
              </span>
              <p className="text-[11px] text-slate-500">Data da Consulta</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <div>
              <span className="font-semibold text-slate-800">
                {agendamento.data_hora?.includes(' ') ? agendamento.data_hora.split(' ')[1]?.substring(0, 5) : 'Horário'}
              </span>
              <p className="text-[11px] text-slate-500">Tipo: {agendamento.tipo_pagamento}</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Anotações Clínicas, Diagnóstico & Prescrição
            </label>
            <textarea
              rows={7}
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              placeholder="Ex: Paciente relata cefaleia tensional e dores musculares há 4 dias. Ausculta pulmonar limpa, PA 120x80 mmHg. Prescrito analgésico e repouso..."
              className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600">Status do Atendimento:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="CONCLUIDO">Concluído (Atendido)</option>
                <option value="AGENDADO">Pendente / Em Espera</option>
                <option value="NAO_COMPARECEU">Não Compareceu (Falta)</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 flex items-center gap-2 shadow-md shadow-teal-600/20 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar Prontuário'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}

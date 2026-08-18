import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle, Plus } from 'lucide-react';
import { api } from '../services/api';

export default function GradeHorariosModal({ medicos, onClose, onSuccess }) {
  const [form, setForm] = useState({
    medico_id: medicos[0]?.id || 1,
    dia_semana: 'SEG',
    hora_inicio: '08:00',
    hora_fim: '12:00',
    duracao_minutos: 30
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.configurarGrade({
        medico_id: Number(form.medico_id),
        dia_semana: form.dia_semana,
        hora_inicio: `${form.hora_inicio}:00`,
        hora_fim: `${form.hora_fim}:00`,
        duracao_minutos: Number(form.duracao_minutos)
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar grade de horário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-teal-700 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-200" />
            <h3 className="font-bold text-lg">Adicionar Turno de Atendimento</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Médico *</label>
            <select
              value={form.medico_id}
              onChange={(e) => setForm({ ...form, medico_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            >
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.medico_nome} ({m.especialidade} - CRM {m.crm})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dia da Semana *</label>
            <select
              value={form.dia_semana}
              onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            >
              <option value="SEG">Segunda-feira (SEG)</option>
              <option value="TER">Terça-feira (TER)</option>
              <option value="QUA">Quarta-feira (QUA)</option>
              <option value="QUI">Quinta-feira (QUI)</option>
              <option value="SEX">Sexta-feira (SEX)</option>
              <option value="SAB">Sábado (SAB)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Início</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Fim</label>
              <input
                type="time"
                value={form.hora_fim}
                onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Duração da Consulta (minutos)</label>
            <select
              value={form.duracao_minutos}
              onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            >
              <option value="15">15 minutos</option>
              <option value="20">20 minutos</option>
              <option value="30">30 minutos (Padrão)</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Adicionando...' : 'Adicionar Grade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

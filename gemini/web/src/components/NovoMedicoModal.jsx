import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function NovoMedicoModal({ especialidades, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    crm: '',
    especialidade_id: especialidades[0]?.id || 1,
    valor_consulta: 150.00,
    senha: '123'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.cpf || !form.crm) {
      setError('Preencha os campos obrigatórios (Nome, CPF, CRM).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.cadastrarMedico({
        ...form,
        especialidade_id: Number(form.especialidade_id),
        valor_consulta: Number(form.valor_consulta)
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao cadastrar profissional.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-teal-700 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-200" />
            <h3 className="font-bold text-lg">Novo Médico no Corpo Clínico</h3>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              placeholder="Ex: Dra. Mariana Costa"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CPF *</label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CRM *</label>
              <input
                type="text"
                required
                placeholder="SP-987654"
                value={form.crm}
                onChange={(e) => setForm({ ...form, crm: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Consulta (R$)</label>
              <input
                type="number"
                step="10"
                value={form.valor_consulta}
                onChange={(e) => setForm({ ...form, valor_consulta: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Especialidade Médica *</label>
            <select
              value={form.especialidade_id}
              onChange={(e) => setForm({ ...form, especialidade_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            >
              {especialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>{esp.nome}</option>
              ))}
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
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Médico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

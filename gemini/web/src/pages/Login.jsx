import React, { useState } from 'react';
import { HeartPulse, Lock, User, AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { api, authService } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    cpf: '111.111.111-11',
    senha: '123',
    nome: '',
    telefone: '',
    tipo_interface: 'PADRAO'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register(form);
        authService.setAuth(res.token, res.usuario);
        onLoginSuccess(res.usuario);
      } else {
        const res = await api.login(form.cpf, form.senha);
        authService.setAuth(res.token, res.usuario);
        onLoginSuccess(res.usuario);
      }
    } catch (err) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (cpf, nome, perfil) => {
    setForm({ ...form, cpf, senha: '123' });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 z-10">
        
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-xl shadow-teal-500/30 mb-3">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Fácil<span className="text-teal-600">Med</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isRegister ? 'Crie sua conta para agendamentos rápidos' : 'Acesse sua conta médica ou de paciente'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Interface</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo_interface: 'PADRAO' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      form.tipo_interface === 'PADRAO' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Modo Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo_interface: 'SIMPLIFICADO' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      form.tipo_interface === 'SIMPLIFICADO' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Modo Simplificado (Idosos)
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">CPF de Acesso</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none pr-10"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none pr-10"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Processando...' : isRegister ? 'Criar Minha Conta' : 'Entrar no FácilMed'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
          >
            {isRegister ? 'Já possui conta? Faça login' : 'Não tem conta? Cadastre-se em 30 segundos'}
          </button>
        </div>

        {/* Demo Fast Account Selector */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Acesso Rápido de Demonstração
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('111.111.111-11', 'Carlos', 'PACIENTE')}
              className="p-2 text-left rounded-xl bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 transition"
            >
              <div className="font-bold text-slate-800">Carlos Silva</div>
              <div className="text-[10px] text-slate-500">Paciente (Padrão)</div>
            </button>
            <button
              onClick={() => handleQuickLogin('222.222.222-22', 'Dona Maria', 'PACIENTE')}
              className="p-2 text-left rounded-xl bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 transition"
            >
              <div className="font-bold text-slate-800">Dona Maria</div>
              <div className="text-[10px] text-teal-600 font-semibold">Paciente (Sênior)</div>
            </button>
            <button
              onClick={() => handleQuickLogin('333.333.333-33', 'Dra. Ana Paula', 'MEDICO')}
              className="p-2 text-left rounded-xl bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 transition"
            >
              <div className="font-bold text-slate-800">Dra. Ana Paula</div>
              <div className="text-[10px] text-slate-500">Médico (Cardiologia)</div>
            </button>
            <button
              onClick={() => handleQuickLogin('000.000.000-00', 'Admin', 'ADMIN')}
              className="p-2 text-left rounded-xl bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 transition"
            >
              <div className="font-bold text-slate-800">Administrador</div>
              <div className="text-[10px] text-slate-500">Gestão Clínica</div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

import React from 'react';
import { 
  Stethoscope, 
  User, 
  LogOut, 
  Calendar, 
  ShieldCheck, 
  MessageSquareHeart, 
  Layers,
  HeartPulse
} from 'lucide-react';
import { authService } from '../services/api';

export default function Navbar({ currentView, setCurrentView, user, onLogout }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView(user?.tipo_usuario === 'MEDICO' ? 'medico' : user?.tipo_usuario === 'ADMIN' ? 'admin' : 'paciente')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                Fácil<span className="text-teal-600">Med</span>
              </span>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Saúde Inteligente</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {user?.tipo_usuario === 'PACIENTE' && (
              <>
                <button
                  onClick={() => setCurrentView('paciente')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentView === 'paciente' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Agendar Consulta
                </button>
                <button
                  onClick={() => setCurrentView('chat')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentView === 'chat' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquareHeart className="w-4 h-4 text-pink-500" />
                  Secretária Sofia (IA)
                </button>
              </>
            )}

            {user?.tipo_usuario === 'MEDICO' && (
              <button
                onClick={() => setCurrentView('medico')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  currentView === 'medico' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Minha Agenda Médica
              </button>
            )}

            {user?.tipo_usuario === 'ADMIN' && (
              <>
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentView === 'admin' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Gestão da Clínica
                </button>
                <button
                  onClick={() => setCurrentView('paciente')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentView === 'paciente' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Simulador de Paciente
                </button>
              </>
            )}
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
              <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-1">{user?.nome}</p>
                <span className="text-[10px] text-teal-700 font-bold tracking-wide uppercase">
                  {user?.tipo_usuario} {user?.tipo_interface === 'SIMPLIFICADO' && '• MODO SÊNIOR'}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sair do sistema"
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import MedicoDashboard from './pages/MedicoDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PacientePortal from './pages/PacientePortal';
import { authService } from './services/api';

export default function App() {
  const [user, setUser] = useState(authService.getUser());
  const [currentView, setCurrentView] = useState('login');

  useEffect(() => {
    const savedUser = authService.getUser();
    if (savedUser) {
      setUser(savedUser);
      if (savedUser.tipo_usuario === 'MEDICO') setCurrentView('medico');
      else if (savedUser.tipo_usuario === 'ADMIN') setCurrentView('admin');
      else setCurrentView('paciente');
    } else {
      setCurrentView('login');
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.tipo_usuario === 'MEDICO') setCurrentView('medico');
    else if (userData.tipo_usuario === 'ADMIN') setCurrentView('admin');
    else setCurrentView('paciente');
  };

  const handleLogout = () => {
    authService.clearAuth();
    setUser(null);
    setCurrentView('login');
  };

  if (!user || currentView === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {currentView === 'medico' && <MedicoDashboard user={user} />}
        {currentView === 'admin' && <AdminDashboard />}
        {currentView === 'paciente' && <PacientePortal user={user} initialTab="agendar" />}
        {currentView === 'chat' && <PacientePortal user={user} initialTab="chat" />}
        {currentView === 'consultas' && <PacientePortal user={user} initialTab="consultas" />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-slate-700">FácilMed © 2026 — Plataforma de Saúde Inteligente & Acessibilidade</p>
          <p className="mt-1 text-[11px] text-slate-400">Google Gemini 2.5 Flash • React 18 • Node.js Express • MySQL • node-cron</p>
        </div>
      </footer>
    </div>
  );
}

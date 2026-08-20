import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PatientMobileView from './components/PatientMobileView';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import GuardianDashboard from './components/GuardianDashboard';
import BlindVoiceAccessibilityMode from './components/BlindVoiceAccessibilityMode';
import VirtualSecretaryChat from './components/VirtualSecretaryChat';
import { api } from './services/api';

export default function App() {
  const [currentRole, setCurrentRole] = useState('PACIENTE'); // 'PACIENTE' | 'RESPONSAVEL' | 'MEDICO' | 'ADMIN'
  const [interfaceMode, setInterfaceMode] = useState('PADRAO'); // 'PADRAO' | 'SIMPLIFICADO' | 'CEGO_VOZ'
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMedIAChatOpen, setIsMedIAChatOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-interface', interfaceMode);
  }, [interfaceMode]);

  async function loadUsers() {
    try {
      const list = await api.getUsers();
      setUsers(list);
      if (list && list.length > 0) {
        setCurrentUser(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="app-container">
      {/* NAVBAR NAVEGAÇÃO */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        interfaceMode={interfaceMode}
        setInterfaceMode={setInterfaceMode}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        users={users}
      />

      {/* CONTEÚDO PRINCIPAL DE ACORDO COM O PERFIL E MODO SELECIONADOS */}
      <main style={{ flex: 1, padding: '16px' }}>
        {/* Se o modo selecionado for CEGO_VOZ, renderiza a interface acessível de voz */}
        {interfaceMode === 'CEGO_VOZ' ? (
          <BlindVoiceAccessibilityMode currentUser={currentUser} />
        ) : (
          <>
            {currentRole === 'PACIENTE' && (
              <PatientMobileView
                currentUser={currentUser}
                interfaceMode={interfaceMode}
                onOpenMedIAChat={() => setIsMedIAChatOpen(true)}
              />
            )}

            {currentRole === 'RESPONSAVEL' && (
              <GuardianDashboard currentUser={currentUser} />
            )}

            {currentRole === 'MEDICO' && (
              <DoctorDashboard currentUser={currentUser} />
            )}

            {currentRole === 'ADMIN' && (
              <AdminDashboard />
            )}
          </>
        )}
      </main>

      {/* MODAL / WIDGET DA SECRETÁRIA VIRTUAL MEDIA */}
      <VirtualSecretaryChat
        isOpen={isMedIAChatOpen}
        onClose={() => setIsMedIAChatOpen(false)}
        currentUser={currentUser}
      />

      {/* RODAPÉ */}
      <footer style={{
        textAlign: 'center',
        padding: '20px',
        fontSize: '13px',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-color)',
        marginTop: 'auto'
      }}>
        FácilMed © 2026 — Sistema Inteligente de Agendamento de Consultas & Acessibilidade | Projeto SENAI
      </footer>
    </div>
  );
}

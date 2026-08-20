import React from 'react';
import { HeartPulse, UserCheck, Stethoscope, ShieldCheck, Eye, Mic, Users } from 'lucide-react';

export default function Navbar({ currentRole, setCurrentRole, interfaceMode, setInterfaceMode, currentUser, setCurrentUser, users }) {
  return (
    <header className="glass-panel" style={{ margin: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderRadius: '20px' }}>
      {/* LOGO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'linear-gradient(135deg, #0284c7, #10b981)', padding: '10px', borderRadius: '14px', display: 'flex', color: '#fff' }}>
          <HeartPulse size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', letterSpacing: '-0.5px', margin: 0 }}>Fácil<span style={{ color: '#0284c7' }}>Med</span></h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Sistema Inteligente de Agendamento</p>
        </div>
      </div>

      {/* SELEÇÃO DE PERFIL E MODO DE ACESSIBILIDADE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Alternador de Modo de Acessibilidade (Padrão, Idosos, Cegos por Voz) */}
        <select
          value={interfaceMode}
          onChange={(e) => setInterfaceMode(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '14px',
            background: interfaceMode === 'SIMPLIFICADO' ? '#000' : interfaceMode === 'CEGO_VOZ' ? '#0b6623' : 'var(--bg-glass)',
            color: '#fff',
            border: '2px solid var(--border-color)',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="PADRAO" style={{ background: '#1e293b' }}>👁️ Modo Padrão</option>
          <option value="SIMPLIFICADO" style={{ background: '#000' }}>👴 Modo Idosos / Simplificado</option>
          <option value="CEGO_VOZ" style={{ background: '#0b6623' }}>🎙️ Modo Acessível para Pessoas Cegas (Voz)</option>
        </select>

        {/* Troca de Perfil de Usuário Demonstrativo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Perfil Demo:</span>
          <select
            value={currentUser?.id || 1}
            onChange={(e) => {
              const u = users.find(x => x.id === parseInt(e.target.value));
              if (u) {
                setCurrentUser(u);
                if (u.tipo_usuario === 'PACIENTE') setCurrentRole('PACIENTE');
                if (u.tipo_usuario === 'RESPONSAVEL') setCurrentRole('RESPONSAVEL');
                if (u.tipo_usuario === 'MEDICO') setCurrentRole('MEDICO');
                if (u.tipo_usuario === 'ADMIN') setCurrentRole('ADMIN');
                if (u.tipo_interface) setInterfaceMode(u.tipo_interface);
              }
            }}
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {u.nome} ({u.tipo_usuario})
              </option>
            ))}
          </select>
        </div>

        {/* Abas de Navegação de Visão */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentRole('PACIENTE')}
            className={`btn ${currentRole === 'PACIENTE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <UserCheck size={16} /> Paciente
          </button>
          <button
            onClick={() => setCurrentRole('RESPONSAVEL')}
            className={`btn ${currentRole === 'RESPONSAVEL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <Users size={16} /> Responsável
          </button>
          <button
            onClick={() => setCurrentRole('MEDICO')}
            className={`btn ${currentRole === 'MEDICO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <Stethoscope size={16} /> Médico
          </button>
          <button
            onClick={() => setCurrentRole('ADMIN')}
            className={`btn ${currentRole === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <ShieldCheck size={16} /> Gestão
          </button>
        </div>
      </div>
    </header>
  );
}

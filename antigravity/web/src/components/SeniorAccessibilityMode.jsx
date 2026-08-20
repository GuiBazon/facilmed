import React, { useState, useEffect } from 'react';
import { Stethoscope, Calendar, Clock, CheckCircle2, AlertTriangle, MessageSquare, PhoneCall, Volume2 } from 'lucide-react';
import { api } from '../services/api';

export default function SeniorAccessibilityMode({ currentUser, onOpenMedIAChat }) {
  const [step, setStep] = useState(1);
  const [especialidades, setEspecialidades] = useState([]);
  const [selectedEspecialidade, setSelectedEspecialidade] = useState(null);
  const [medicos, setMedicos] = useState([]);
  const [selectedMedico, setSelectedMedico] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [selectedHora, setSelectedHora] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('PARTICULAR');
  const [carteirinha, setCarteirinha] = useState('');
  const [msgConfirmacao, setMsgConfirmacao] = useState('');
  const [erroMsg, setErroMsg] = useState('');

  useEffect(() => {
    loadEspecialidades();
    // Definir data padrao para amanha
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  async function loadEspecialidades() {
    try {
      const data = await api.getEspecialidades();
      setEspecialidades(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSelectEspecialidade(esp) {
    setSelectedEspecialidade(esp);
    try {
      const list = await api.getMedicos(esp.id);
      setMedicos(list);
      setStep(2);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSelectMedico(m) {
    setSelectedMedico(m);
    loadHorariosMedico(m.id, selectedDate);
    setStep(3);
  }

  async function loadHorariosMedico(medicoId, data) {
    try {
      const res = await api.getHorariosEStatus(medicoId, data);
      setHorarios(res.horarios || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleFinalizarAgendamento() {
    setErroMsg('');
    setMsgConfirmacao('');
    try {
      const dataHoraStr = `${selectedDate} ${selectedHora}:00`;
      const res = await api.createAgendamento({
        paciente_id: currentUser?.id || 2, // Dona Maria (Idosa) por padrao
        medico_id: selectedMedico.id,
        data_hora: dataHoraStr,
        tipo_pagamento: tipoPagamento,
        carteirinha_convenio: tipoPagamento === 'CONVENIO' ? carteirinha : null
      });

      setMsgConfirmacao(`CONSULTA MARCADA COM SUCESSO! 
Data: ${selectedDate} às ${selectedHora}
Médico(a): ${selectedMedico.nome}`);
      setStep(5);
    } catch (err) {
      setErroMsg(err.message || 'Horário indisponível. Escolha outro horário.');
    }
  }

  function falarTexto(texto) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* CABEÇALHO ACESSÍVEL GRANDÃO */}
      <div style={{ background: '#004085', color: '#ffffff', padding: '24px', borderRadius: '20px', textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', margin: 0, fontWeight: '800' }}>👵 MODO SIMPLIFICADO / TERCEIRA IDADE</h1>
        <p style={{ fontSize: '22px', margin: '8px 0 0 0' }}>Agendamento fácil com botões grandes e leitura em voz alta</p>
      </div>

      {/* BOTÃO ASSISTENTE MEDIA */}
      <button
        onClick={() => {
          falarTexto('Abrindo conversa com a Secretária MedIA');
          onOpenMedIAChat();
        }}
        style={{
          width: '100%',
          padding: '24px',
          fontSize: '24px',
          fontWeight: 'bold',
          background: '#0b6623',
          color: '#ffffff',
          border: '4px solid #000000',
          borderRadius: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '24px',
          boxShadow: '0 6px 15px rgba(0,0,0,0.3)'
        }}
      >
        <MessageSquare size={36} />
        FALAR COM A SECRETÁRIA IA MedIA (POR VOZ/TEXTO)
      </button>

      {/* ETAPA 1: SELECIONAR ESPECIALIDADE */}
      {step === 1 && (
        <div style={{ background: '#ffffff', border: '3px solid #000', padding: '24px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '28px', color: '#000', margin: 0 }}>PASSO 1: Escolha o Tipo de Consulta</h2>
            <button onClick={() => falarTexto('Escolha o tipo de consulta que você precisa')} style={{ background: '#e2e8f0', border: '2px solid #000', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer' }}>
              <Volume2 size={24} /> OUVIR
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            {especialidades.map(esp => (
              <button
                key={esp.id}
                onClick={() => {
                  falarTexto(`Você escolheu ${esp.nome}`);
                  handleSelectEspecialidade(esp);
                }}
                className="btn-accessible-large"
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  color: '#000',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  borderRadius: '16px'
                }}
              >
                <Stethoscope size={36} color="#004085" />
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{esp.nome}</div>
                  <div style={{ fontSize: '18px', color: '#475569', fontWeight: 'normal' }}>{esp.descricao}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ETAPA 2: SELECIONAR MÉDICO */}
      {step === 2 && (
        <div style={{ background: '#ffffff', border: '3px solid #000', padding: '24px', borderRadius: '20px' }}>
          <button onClick={() => setStep(1)} style={{ fontSize: '20px', padding: '12px 20px', marginBottom: '16px', background: '#cbd5e1', border: '2px solid #000', borderRadius: '12px', cursor: 'pointer' }}>
            ⬅️ VOLTAR PARA ETAPA ANTERIOR
          </button>
          <h2 style={{ fontSize: '28px', color: '#000', marginBottom: '20px' }}>PASSO 2: Escolha o Doutor(a) de {selectedEspecialidade?.nome}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            {medicos.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  falarTexto(`Doutor ${m.nome} selecionado`);
                  handleSelectMedico(m);
                }}
                className="btn-accessible-large"
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  color: '#000',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  borderRadius: '16px'
                }}
              >
                <Stethoscope size={36} color="#004085" />
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{m.nome}</div>
                  <div style={{ fontSize: '20px', color: '#0b6623', fontWeight: 'bold' }}>Consulta: R$ {m.valor_consulta.toFixed(2)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ETAPA 3: SELECIONAR DATA E HORÁRIO */}
      {step === 3 && (
        <div style={{ background: '#ffffff', border: '3px solid #000', padding: '24px', borderRadius: '20px' }}>
          <button onClick={() => setStep(2)} style={{ fontSize: '20px', padding: '12px 20px', marginBottom: '16px', background: '#cbd5e1', border: '2px solid #000', borderRadius: '12px', cursor: 'pointer' }}>
            ⬅️ VOLTAR PARA ETAPA ANTERIOR
          </button>
          <h2 style={{ fontSize: '28px', color: '#000', marginBottom: '10px' }}>PASSO 3: Escolha o Dia e a Hora</h2>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#004085' }}>Doutor(a): {selectedMedico?.nome}</p>

          <div style={{ margin: '20px 0' }}>
            <label style={{ display: 'block', fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Selecione a Data:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                loadHorariosMedico(selectedMedico.id, e.target.value);
              }}
              style={{ width: '100%', padding: '18px', fontSize: '24px', border: '3px solid #000', borderRadius: '14px', fontWeight: 'bold' }}
            />
          </div>

          <h3 style={{ fontSize: '24px', margin: '20px 0 12px 0' }}>Horários Livres para este dia:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {horarios.filter(h => h.disponivel).map(h => (
              <button
                key={h.hora}
                onClick={() => {
                  setSelectedHora(h.hora);
                  setStep(4);
                }}
                style={{
                  padding: '20px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  background: selectedHora === h.hora ? '#004085' : '#e2e8f0',
                  color: selectedHora === h.hora ? '#fff' : '#000',
                  border: '3px solid #000',
                  borderRadius: '16px',
                  cursor: 'pointer'
                }}
              >
                {h.hora}
              </button>
            ))}
          </div>

          {horarios.filter(h => h.disponivel).length === 0 && (
            <div style={{ background: '#fef3c7', border: '3px solid #b45309', padding: '20px', borderRadius: '16px', marginTop: '20px' }}>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#b45309', margin: 0 }}>
                ⚠️ Não temos horários vagos neste dia. Escolha outra data no campo acima ou fale com a MedIA!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ETAPA 4: PAGAMENTO E CONFIRMAÇÃO */}
      {step === 4 && (
        <div style={{ background: '#ffffff', border: '3px solid #000', padding: '24px', borderRadius: '20px' }}>
          <button onClick={() => setStep(3)} style={{ fontSize: '20px', padding: '12px 20px', marginBottom: '16px', background: '#cbd5e1', border: '2px solid #000', borderRadius: '12px', cursor: 'pointer' }}>
            ⬅️ VOLTAR PARA MUDAR O HORÁRIO
          </button>
          <h2 style={{ fontSize: '28px', color: '#000', marginBottom: '20px' }}>PASSO 4: Como deseja pagar?</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={() => setTipoPagamento('PARTICULAR')}
              style={{
                padding: '24px',
                fontSize: '24px',
                fontWeight: 'bold',
                background: tipoPagamento === 'PARTICULAR' ? '#004085' : '#f8fafc',
                color: tipoPagamento === 'PARTICULAR' ? '#ffffff' : '#000000',
                border: '3px solid #000',
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              💵 CONSULTA PARTICULAR (R$ {selectedMedico?.valor_consulta.toFixed(2)})
            </button>

            <button
              onClick={() => setTipoPagamento('CONVENIO')}
              style={{
                padding: '24px',
                fontSize: '24px',
                fontWeight: 'bold',
                background: tipoPagamento === 'CONVENIO' ? '#004085' : '#f8fafc',
                color: tipoPagamento === 'CONVENIO' ? '#ffffff' : '#000000',
                border: '3px solid #000',
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              💳 CONVÊNIO MÉDICO (Sem custo direto)
            </button>
          </div>

          {tipoPagamento === 'CONVENIO' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Número da Carteirinha do Convênio:</label>
              <input
                type="text"
                value={carteirinha}
                onChange={(e) => setCarteirinha(e.target.value)}
                placeholder="Digite os números aqui..."
                style={{ width: '100%', padding: '20px', fontSize: '24px', border: '3px solid #000', borderRadius: '16px' }}
              />
            </div>
          )}

          {erroMsg && (
            <div style={{ background: '#fee2e2', border: '3px solid #991b1b', color: '#991b1b', padding: '20px', borderRadius: '16px', fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
              ⚠️ {erroMsg}
            </div>
          )}

          <button
            onClick={handleFinalizarAgendamento}
            style={{
              width: '100%',
              padding: '26px',
              fontSize: '28px',
              fontWeight: '900',
              background: '#0b6623',
              color: '#ffffff',
              border: '4px solid #000',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            ✅ CONFIRMAR MEU AGENDAMENTO
          </button>
        </div>
      )}

      {/* ETAPA 5: SUCESSO */}
      {step === 5 && (
        <div style={{ background: '#ffffff', border: '4px solid #0b6623', padding: '32px', borderRadius: '24px', textAlign: 'center' }}>
          <CheckCircle2 size={80} color="#0b6623" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '36px', color: '#0b6623', margin: '0 0 16px 0', fontWeight: '900' }}>CONSULTA MARCADA!</h2>
          <div style={{ background: '#f0fdf4', border: '2px solid #0b6623', padding: '24px', borderRadius: '16px', fontSize: '26px', fontWeight: 'bold', whiteSpace: 'pre-line', marginBottom: '24px' }}>
            {msgConfirmacao}
          </div>

          <button
            onClick={() => {
              setStep(1);
              setSelectedHora('');
            }}
            style={{
              padding: '24px 36px',
              fontSize: '24px',
              fontWeight: 'bold',
              background: '#004085',
              color: '#fff',
              border: '3px solid #000',
              borderRadius: '16px',
              cursor: 'pointer'
            }}
          >
            🔄 FAZER OUTRO AGENDAMENTO
          </button>
        </div>
      )}
    </div>
  );
}

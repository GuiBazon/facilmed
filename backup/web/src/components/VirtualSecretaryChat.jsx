import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Mic, MicOff, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span style={{ whiteSpace: 'pre-line' }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
}

export default function VirtualSecretaryChat({ isOpen, onClose, currentUser }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'media',
      text: `Olá, ${currentUser?.nome || 'Paciente'}! Eu sou a MedIA, sua Secretária Virtual 👩‍⚕️. Como posso ajudar no seu agendamento hoje?`
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSendMessage(textoCustom) {
    const msgParaEnviar = textoCustom || inputMsg;
    if (!msgParaEnviar.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: msgParaEnviar };
    setMessages(prev => [...prev, userMessage]);
    if (!textoCustom) setInputMsg('');
    setLoading(true);

    try {
      const res = await api.enviarMensagemMedIA(msgParaEnviar, messages, currentUser?.id || 1);
      const medIAMessage = {
        id: Date.now() + 1,
        sender: 'media',
        text: res.resposta,
        toolExecuted: res.toolExecuted,
        toolResult: res.toolResult,
        fonte: res.fonte
      };
      setMessages(prev => [...prev, medIAMessage]);

      // Falar a resposta se o recurso estiver disponivel
      if ('speechSynthesis' in window && isListening) {
        const utterance = new SpeechSynthesisUtterance(res.resposta.replace(/\*/g, ''));
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'media', text: 'Desculpe, ocorreu uma instabilidade no servidor de IA. Tente novamente em instantes.' }]);
    } finally {
      setLoading(false);
    }
  }

  function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Seu navegador não possui suporte direto a Reconhecimento de Voz Web Speech API. Use o teclado normalmente!');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';

    if (!isListening) {
      setIsListening(true);
      recognition.start();
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMsg(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '420px',
      maxWidth: '92vw',
      height: '600px',
      maxHeight: '85vh',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
      border: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)'
    }}>
      {/* HEADER DO CHAT */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7, #10b981)',
        padding: '16px 20px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}>
            <Bot size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>MedIA (Secretária IA)</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Ollama Local / Autonomous AI</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
          <X size={24} />
        </button>
      </div>

      {/* CHIPS DE AÇÕES RÁPIDAS */}
      <div style={{ padding: '8px 12px', background: 'var(--bg-primary)', display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => handleSendMessage('Quais horários estão livres com a Dra. Ana amanhã?')}
          style={{ padding: '6px 12px', borderRadius: '999px', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}
        >
          🔍 Ver Vagas Dra. Ana
        </button>
        <button
          onClick={() => handleSendMessage('Quero agendar consulta com Dr. Roberto amanhã às 09:00')}
          style={{ padding: '6px 12px', borderRadius: '999px', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}
        >
          🗓️ Agendar com Dr. Roberto
        </button>
        <button
          onClick={() => handleSendMessage('Quero cancelar minha última consulta')}
          style={{ padding: '6px 12px', borderRadius: '999px', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', whiteSpace: 'nowrap', cursor: 'pointer' }}
        >
          ❌ Cancelar Consulta (RN01)
        </button>
      </div>

      {/* HISTÓRICO DE MENSAGENS */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map(m => (
          <div
            key={m.id}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-primary)',
              color: m.sender === 'user' ? '#fff' : 'var(--text-primary)',
              fontSize: '14px',
              border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
              lineHeight: 1.5
            }}
          >
            {renderFormattedText(m.text)}

            {/* FEEDBACK DE TOOL EXECUTADA */}
            {m.toolExecuted && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--emerald-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> Tool Calling: {m.toolExecuted}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            MedIA está consultando o banco de dados... ⏳
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ÁREA DE DIGITAÇÃO E VOZ */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ padding: '12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={toggleVoiceInput}
          style={{
            background: isListening ? 'var(--rose-danger)' : 'var(--bg-glass)',
            color: '#fff',
            border: '1px solid var(--border-color)',
            padding: '10px',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
          title="Digitar ou falar por voz"
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          placeholder={isListening ? 'Fale agora...' : 'Digite sua mensagem para a MedIA...'}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', borderRadius: '12px' }}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

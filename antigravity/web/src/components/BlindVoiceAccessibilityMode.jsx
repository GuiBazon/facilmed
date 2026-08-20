import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Bot, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function BlindVoiceAccessibilityMode({ currentUser }) {
  const [isListening, setIsListening] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [lastResponseText, setLastResponseText] = useState('Olá! Este é o Modo Acessível para Pessoas Cegas. Clique no botão gigante de microfone abaixo para conversar por voz com a MedIA.');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    falarTexto(lastResponseText);
  }, []);

  function falarTexto(texto) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto.replace(/[*#•]/g, ''));
      utterance.lang = 'pt-BR';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }

  function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const msg = 'Navegador sem suporte a voz Web Speech API. Digite sua mensagem no campo abaixo.';
      setLastResponseText(msg);
      falarTexto(msg);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';

    if (!isListening) {
      setIsListening(true);
      falarTexto('Pode falar agora, estou ouvindo.');
      recognition.start();

      recognition.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        setTranscriptText(text);
        setIsListening(false);
        await enviarVozParaMedIA(text);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
    }
  }

  async function enviarVozParaMedIA(textoInput) {
    setLoading(true);
    try {
      const res = await api.enviarMensagemMedIA(textoInput, [], currentUser?.id || 1);
      setLastResponseText(res.resposta);
      falarTexto(res.resposta);
    } catch (err) {
      const erroMsg = 'Desculpe, não consegui ouvir com clareza. Tente falar novamente.';
      setLastResponseText(erroMsg);
      falarTexto(erroMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
      
      {/* PAINEL CENTRALIZADO CEGO */}
      <div style={{ background: '#0b6623', color: '#fff', padding: '24px', borderRadius: '24px', marginBottom: '24px', border: '4px solid #000' }}>
        <h1 style={{ fontSize: '32px', margin: 0, fontWeight: '900' }}>🎙️ MODO ACESSÍVEL PARA PESSOAS CEGAS</h1>
        <p style={{ fontSize: '20px', marginTop: '8px' }}>Interface 100% Conversacional Guiada por Voz</p>
      </div>

      {/* BOTÃO GIGANTE DE MICROFONE */}
      <button
        onClick={toggleVoiceInput}
        aria-label="Ativar microfone para falar com a MedIA"
        style={{
          width: '100%',
          padding: '40px',
          borderRadius: '32px',
          background: isListening ? '#991b1b' : '#004085',
          color: '#ffffff',
          border: '6px solid #000000',
          fontSize: '32px',
          fontWeight: '900',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          marginBottom: '32px'
        }}
      >
        {isListening ? <MicOff size={80} color="#fff" /> : <Mic size={80} color="#fff" />}
        {isListening ? '🔴 OUVINDO... FALE AGORA!' : '🎙️ TOQUE AQUI PARA FALAR COM A MEDIA'}
      </button>

      {/* REPETIR ÁUDIO */}
      <button
        onClick={() => falarTexto(lastResponseText)}
        style={{
          width: '100%',
          padding: '20px',
          fontSize: '24px',
          fontWeight: 'bold',
          background: '#f1f5f9',
          color: '#000',
          border: '3px solid #000',
          borderRadius: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '28px'
        }}
      >
        <Volume2 size={36} /> OUVIR RESPOSTA DA MEDIA NOVAMENTE
      </button>

      {/* CAIXA DE TEXTO DA RESPOSTA */}
      <div style={{ background: '#ffffff', border: '4px solid #000', padding: '28px', borderRadius: '24px', textAlign: 'left' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
          O que você falou: <span style={{ color: '#000' }}>{transcriptText || '(Clique no microfone acima)'}</span>
        </div>
        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#000', whiteSpace: 'pre-line', marginTop: '16px' }}>
          {loading ? 'MedIA está consultando os dados por voz... ⏳' : lastResponseText}
        </div>
      </div>

    </div>
  );
}

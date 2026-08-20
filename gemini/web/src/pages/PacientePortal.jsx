import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  MessageSquareHeart, 
  Send, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  XCircle,
  Accessibility,
  Check,
  ShieldAlert,
  ArrowRight,
  ListOrdered
} from 'lucide-react';
import { api } from '../services/api';

export default function PacientePortal({ user, initialTab = 'agendar' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'agendar', 'chat', 'consultas'
  const [modoAcessivel, setModoAcessivel] = useState(user?.tipo_interface === 'SIMPLIFICADO');
  
  // Wizard States (Passo a passo)
  const [step, setStep] = useState(1);
  const [especialidades, setEspecialidades] = useState([]);
  const [selectedEsp, setSelectedEsp] = useState(null);
  const [selectedMedico, setSelectedMedico] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [disponibilidade, setDisponibilidade] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('PARTICULAR');
  const [carteirinha, setCarteirinha] = useState('');

  // Agendamento / Histórico
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDisp, setLoadingDisp] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Chat com Sofia (IA)
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'model',
      text: `Olá, ${user?.nome || 'paciente'}! Sou a Sofia, secretária virtual do FácilMed. Como posso te ajudar hoje? Posso verificar horários livres, agendar ou cancelar consultas para você.`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadEspecialidades();
    loadMinhasConsultas();
  }, []);

  const loadEspecialidades = async () => {
    try {
      const data = await api.getEspecialidades();
      setEspecialidades(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMinhasConsultas = async () => {
    try {
      const data = await api.getAgendamentosPaciente(user?.id);
      setConsultas(data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleInterfaceMode = async () => {
    const nextMode = !modoAcessivel;
    setModoAcessivel(nextMode);
    try {
      await api.updatePreferencias(nextMode ? 'SIMPLIFICADO' : 'PADRAO');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectMedico = async (med) => {
    setSelectedMedico(med);
    // Seleciona o dia de amanhã ou próxima segunda
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 1);
    const dateStr = hoje.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    await checkDisponibilidade(med.id, dateStr);
    setStep(3); // Vai para calendário / horário
  };

  const checkDisponibilidade = async (medicoId, dataStr) => {
    setLoadingDisp(true);
    try {
      const disp = await api.getDisponibilidade(medicoId, dataStr);
      setDisponibilidade(disp);
      setSelectedTime('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDisp(false);
    }
  };

  const handleDateChange = (e) => {
    const d = e.target.value;
    setSelectedDate(d);
    if (selectedMedico) {
      checkDisponibilidade(selectedMedico.id, d);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedMedico || !selectedDate || !selectedTime) return;

    setLoading(true);
    setStatusMsg(null);

    const dataHora = `${selectedDate} ${selectedTime}:00`;

    try {
      const res = await api.criarAgendamento({
        paciente_id: user?.id || 1,
        medico_id: selectedMedico.id,
        data_hora: dataHora,
        tipo_pagamento: tipoPagamento,
        carteirinha_convenio: tipoPagamento === 'CONVENIO' ? carteirinha : undefined
      });

      setStatusMsg({ type: 'success', text: `Consulta confirmada com sucesso para ${selectedDate} às ${selectedTime}!` });
      loadMinhasConsultas();
      setStep(5); // Tela de sucesso
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Erro ao realizar agendamento.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarConsulta = async (agendamentoId) => {
    if (!confirm('Deseja realmente cancelar esta consulta?')) return;

    setLoading(true);
    try {
      const res = await api.cancelarAgendamento(agendamentoId);
      alert(res.mensagem || 'Consulta cancelada com sucesso!');
      loadMinhasConsultas();
    } catch (err) {
      alert(`⚠️ ${err.message || 'Não foi possível cancelar a consulta.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEntrarFila = async () => {
    if (!selectedMedico || !selectedDate) return;
    setLoading(true);
    try {
      const res = await api.entrarFilaEspera(selectedMedico.id, selectedDate, user?.id || 1);
      alert(res.mensagem || 'Você foi inscrito na fila de espera com sucesso!');
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userText = inputMessage;
    setInputMessage('');
    
    const newHistory = [...chatMessages, { role: 'user', text: userText }];
    setChatMessages(newHistory);
    setChatLoading(true);

    try {
      const res = await api.enviarMensagemChat(userText, chatMessages, user?.id || 1);
      setChatMessages([
        ...newHistory,
        {
          role: 'model',
          text: res.resposta,
          acoes: res.acoes_executadas
        }
      ]);
      loadMinhasConsultas();
    } catch (err) {
      setChatMessages([
        ...newHistory,
        {
          role: 'model',
          text: 'Desculpe, ocorreu um problema ao processar sua solicitação no momento. Por favor, tente novamente.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Gerar dias rápidos para o calendário visual
  const getProximosDias = () => {
    const dias = [];
    const hoje = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const isDomingo = d.getDay() === 0;
      const iso = d.toISOString().split('T')[0];
      const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dias.push({ iso, diaSemana, diaMes, isDomingo });
    }
    return dias;
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 ${modoAcessivel ? 'text-lg' : 'text-sm'}`}>
      
      {/* Top Banner with Senior Accessibility Toggle */}
      <div className={`rounded-3xl p-6 transition shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 ${
        modoAcessivel 
          ? 'bg-amber-950 text-amber-50 border-4 border-amber-400' 
          : 'bg-gradient-to-r from-teal-800 to-teal-950 text-white'
      }`}>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Área do Paciente FácilMed</span>
          <h1 className={`font-black tracking-tight ${modoAcessivel ? 'text-3xl sm:text-4xl text-amber-300' : 'text-2xl sm:text-3xl'}`}>
            Bem-vindo(a), {user?.nome || 'Paciente'}
          </h1>
          <p className={`mt-1 ${modoAcessivel ? 'text-base text-amber-100 font-semibold' : 'text-xs text-teal-200'}`}>
            {modoAcessivel 
              ? '🔍 MODO SIMPLIFICADO ATIVO: Letras ampliadas e botões de toque largo para facilitar seu uso.' 
              : 'Agende consultas presenciais ou converse em tempo real com a nossa secretária virtual.'}
          </p>
        </div>

        {/* Toggle Mode Button */}
        <button
          onClick={toggleInterfaceMode}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold transition shadow-md ${
            modoAcessivel 
              ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 text-base scale-105 ring-4 ring-amber-300/50' 
              : 'bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20'
          }`}
        >
          <Accessibility className="w-5 h-5" />
          {modoAcessivel ? 'Desativar Modo Simplificado' : 'Ativar Modo Simplificado (Idosos)'}
        </button>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('agendar')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition ${
            activeTab === 'agendar'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          } ${modoAcessivel ? 'text-lg py-4 px-6 min-h-[60px]' : 'text-sm'}`}
        >
          <Calendar className="w-5 h-5" />
          Novo Agendamento
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition ${
            activeTab === 'chat'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          } ${modoAcessivel ? 'text-lg py-4 px-6 min-h-[60px]' : 'text-sm'}`}
        >
          <MessageSquareHeart className="w-5 h-5 text-pink-400" />
          Secretária Sofia (IA)
        </button>

        <button
          onClick={() => setActiveTab('consultas')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition ${
            activeTab === 'consultas'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          } ${modoAcessivel ? 'text-lg py-4 px-6 min-h-[60px]' : 'text-sm'}`}
        >
          <FileText className="w-5 h-5" />
          Minhas Consultas ({consultas.length})
        </button>
      </div>

      {/* TAB 1: Visual Scheduling Wizard (Passo a Passo) */}
      {activeTab === 'agendar' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-6">
            {[
              { num: 1, label: 'Especialidade' },
              { num: 2, label: 'Médico' },
              { num: 3, label: 'Data e Hora' },
              { num: 4, label: 'Pagamento' }
            ].map((st) => (
              <div key={st.num} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition ${
                    step === st.num
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                      : step > st.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  } ${modoAcessivel ? 'w-12 h-12 text-lg' : ''}`}
                >
                  {step > st.num ? <Check className="w-5 h-5" /> : st.num}
                </div>
                <span className={`text-xs font-semibold ${step === st.num ? 'text-teal-800 font-bold' : 'text-slate-500'} ${modoAcessivel ? 'text-sm' : ''}`}>
                  {st.label}
                </span>
              </div>
            ))}
          </div>

          {statusMsg && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
              <span className="font-semibold">{statusMsg.text}</span>
            </div>
          )}

          {/* PASSO 1: Selecionar Especialidade */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className={`font-extrabold text-slate-900 ${modoAcessivel ? 'text-2xl' : 'text-lg'}`}>
                1. Escolha a Especialidade Médica:
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {especialidades.map((esp) => (
                  <button
                    key={esp.id}
                    onClick={() => {
                      setSelectedEsp(esp);
                      setStep(2);
                    }}
                    className={`p-5 rounded-2xl border-2 text-left transition hover:border-teal-500 hover:shadow-md flex items-start gap-4 ${
                      selectedEsp?.id === esp.id ? 'border-teal-600 bg-teal-50/60' : 'border-slate-200 bg-white'
                    } ${modoAcessivel ? 'min-h-[80px] p-6' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold shrink-0">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-slate-900 ${modoAcessivel ? 'text-xl' : 'text-base'}`}>{esp.nome}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{esp.descricao || 'Atendimento especializado.'}</p>
                      <span className="text-[11px] font-semibold text-teal-700 mt-2 inline-block">
                        {esp.medicos?.length || 1} médico(s) disponível(is)
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 2: Selecionar Médico */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className={`font-extrabold text-slate-900 ${modoAcessivel ? 'text-2xl' : 'text-lg'}`}>
                  2. Escolha o Profissional em {selectedEsp?.nome}:
                </h2>
                <button onClick={() => setStep(1)} className="text-xs text-teal-700 font-bold hover:underline">
                  Voltar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(selectedEsp?.medicos || []).map((med) => (
                  <button
                    key={med.id}
                    onClick={() => handleSelectMedico(med)}
                    className={`p-5 rounded-2xl border-2 text-left transition hover:border-teal-500 hover:shadow-md flex items-center justify-between ${
                      selectedMedico?.id === med.id ? 'border-teal-600 bg-teal-50/60' : 'border-slate-200 bg-white'
                    } ${modoAcessivel ? 'min-h-[85px] p-6' : ''}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-lg">
                        {med.medico_nome?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className={`font-bold text-slate-900 ${modoAcessivel ? 'text-xl' : 'text-base'}`}>{med.medico_nome}</h3>
                        <p className="text-xs text-slate-500 font-mono">CRM: {med.crm}</p>
                        <p className="text-xs font-bold text-teal-700 mt-0.5">Consulta: R$ {Number(med.valor_consulta || 150).toFixed(2)}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 3: Calendário Visual e Horários */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className={`font-extrabold text-slate-900 ${modoAcessivel ? 'text-2xl' : 'text-lg'}`}>
                  3. Selecione o Dia e Horário com {selectedMedico?.medico_nome}:
                </h2>
                <button onClick={() => setStep(2)} className="text-xs text-teal-700 font-bold hover:underline">
                  Trocar Médico
                </button>
              </div>

              {/* Calendário Visual com Dias Próximos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Próximos Dias Disponíveis:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {getProximosDias().map((dia) => {
                    const isSelected = selectedDate === dia.iso;
                    const isSunday = dia.isDomingo;

                    return (
                      <button
                        key={dia.iso}
                        disabled={isSunday}
                        onClick={() => {
                          setSelectedDate(dia.iso);
                          checkDisponibilidade(selectedMedico.id, dia.iso);
                        }}
                        className={`p-3 rounded-2xl text-center border-2 transition flex flex-col items-center justify-center ${
                          isSunday
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-200'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-teal-400'
                        } ${modoAcessivel ? 'min-h-[75px] py-4' : ''}`}
                      >
                        <span className="text-[11px] uppercase font-bold tracking-wider">{dia.diaSemana}</span>
                        <span className={`text-base font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>{dia.diaMes}</span>
                        {isSunday && <span className="text-[9px] text-red-500 font-bold">Fechado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Escolha de Data Manual */}
              <div className="max-w-xs">
                <label className="block text-xs font-bold text-slate-700 mb-1">Ou escolha outra data:</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Grade de Horários Livres / Ocupados */}
              {loadingDisp ? (
                <div className="py-8 text-center text-slate-400">Carregando disponibilidade...</div>
              ) : disponibilidade ? (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Horários Livres para {selectedDate} ({disponibilidade.horarios_livres?.length || 0} vagas):
                    </span>
                    {disponibilidade.horarios_livres?.length === 0 && (
                      <span className="text-xs text-rose-600 font-bold">Sem vagas para esta data</span>
                    )}
                  </div>

                  {disponibilidade.horarios_livres?.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {disponibilidade.horarios_livres.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-3 px-4 rounded-xl font-mono font-bold text-center border-2 transition ${
                            selectedTime === slot
                              ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'
                          } ${modoAcessivel ? 'text-xl py-4 min-h-[60px]' : 'text-sm'}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                      <p className="text-sm text-slate-600 font-medium">
                        Todos os horários para este médico na data selecionada estão ocupados.
                      </p>
                      <button
                        onClick={handleEntrarFila}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2"
                      >
                        <ListOrdered className="w-4 h-4" />
                        Entrar na Fila de Espera (RN03)
                      </button>
                    </div>
                  )}

                  {selectedTime && (
                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={() => setStep(4)}
                        className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                      >
                        Continuar para Pagamento
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                </div>
              ) : null}

            </div>
          )}

          {/* PASSO 4: Tipo de Pagamento & Confirmação */}
          {step === 4 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="flex justify-between items-center">
                <h2 className={`font-extrabold text-slate-900 ${modoAcessivel ? 'text-2xl' : 'text-lg'}`}>
                  4. Forma de Pagamento e Confirmação:
                </h2>
                <button onClick={() => setStep(3)} className="text-xs text-teal-700 font-bold hover:underline">
                  Alterar Horário
                </button>
              </div>

              {/* Resumo da Consulta */}
              <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Médico:</span>
                  <strong className="text-slate-900">{selectedMedico?.medico_nome}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Especialidade:</span>
                  <strong className="text-slate-900">{selectedEsp?.nome}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Data e Horário:</span>
                  <strong className="text-teal-800 font-mono">{selectedDate} às {selectedTime}</strong>
                </div>
              </div>

              {/* Opções de Pagamento */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Selecione o Tipo de Atendimento:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoPagamento('PARTICULAR')}
                    className={`p-4 rounded-2xl border-2 text-left transition ${
                      tipoPagamento === 'PARTICULAR' ? 'border-teal-600 bg-teal-50/50' : 'border-slate-200'
                    } ${modoAcessivel ? 'min-h-[70px]' : ''}`}
                  >
                    <strong className="block text-sm text-slate-900">Particular</strong>
                    <span className="text-xs text-teal-700 font-bold">R$ {Number(selectedMedico?.valor_consulta || 150).toFixed(2)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoPagamento('CONVENIO')}
                    className={`p-4 rounded-2xl border-2 text-left transition ${
                      tipoPagamento === 'CONVENIO' ? 'border-teal-600 bg-teal-50/50' : 'border-slate-200'
                    } ${modoAcessivel ? 'min-h-[70px]' : ''}`}
                  >
                    <strong className="block text-sm text-slate-900">Convênio Médico</strong>
                    <span className="text-xs text-slate-500">Unimed, Bradesco, etc.</span>
                  </button>
                </div>

                {tipoPagamento === 'CONVENIO' && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Número da Carteirinha do Convênio *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 0012.3456.7890"
                      value={carteirinha}
                      onChange={(e) => setCarteirinha(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Final Confirm Button */}
              <button
                onClick={handleConfirmBooking}
                disabled={loading}
                className={`w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-extrabold shadow-xl shadow-teal-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                  modoAcessivel ? 'text-2xl min-h-[75px]' : 'text-base'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                {loading ? 'Confirmando no Sistema...' : 'Confirmar Agendamento Agora'}
              </button>

            </div>
          )}

          {/* PASSO 5: Sucesso */}
          {step === 5 && (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Agendamento Realizado!</h2>
              <p className="text-sm text-slate-600">
                Sua consulta com {selectedMedico?.medico_nome} foi registrada com sucesso para {selectedDate} às {selectedTime}.
              </p>
              <div className="pt-4 flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedEsp(null);
                    setSelectedMedico(null);
                    setSelectedTime('');
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Novo Agendamento
                </button>
                <button
                  onClick={() => setActiveTab('consultas')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-md transition"
                >
                  Ver Minhas Consultas
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: Chat com a Secretária Sofia (Google Gemini & Function Calling) */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-6 py-4 text-white flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  Sofia — Secretária Virtual Autônoma
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-xs text-teal-200">Google Gemini 2.5 Flash • Tool Calling Ativo</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/20">
              RN01 • RN02 • RN03
            </span>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, i) => {
              const isMe = msg.role === 'user';
              return (
                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-xl p-4 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-teal-600 text-white rounded-br-none shadow-md shadow-teal-600/10'
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                    } ${modoAcessivel ? 'text-lg p-5' : ''}`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Badges de Ações Executadas pela IA */}
                  {msg.acoes && msg.acoes.length > 0 && (
                    <div className="mt-2 space-y-1 max-w-xl">
                      {msg.acoes.map((ac, acIdx) => (
                        <div
                          key={acIdx}
                          className="text-[11px] bg-teal-100/80 text-teal-900 border border-teal-300/80 px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                          <span>Ferramenta executada: <strong>{ac.tool}</strong></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold py-2">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                <span>Sofia está consultando o FácilMed...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-6 py-2 bg-slate-100/70 border-t border-slate-200 flex gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setInputMessage('Gostaria de ver horários para Cardiologista amanhã')}
              className="px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700 hover:border-teal-500 shrink-0"
            >
              🕒 Horários Cardiologista
            </button>
            <button
              onClick={() => setInputMessage('Quero agendar uma consulta com Clínico Geral')}
              className="px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700 hover:border-teal-500 shrink-0"
            >
              📅 Agendar Consulta
            </button>
            <button
              onClick={() => setInputMessage('Quero cancelar minha consulta agendada')}
              className="px-3 py-1 rounded-full bg-white border border-slate-300 text-slate-700 hover:border-teal-500 shrink-0"
            >
              ❌ Cancelar Consulta (RN02)
            </button>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendChatMessage} className="p-4 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              placeholder="Digite sua mensagem para a Sofia..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className={`flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none ${
                modoAcessivel ? 'text-lg py-4' : ''
              }`}
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMessage.trim()}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

        </div>
      )}

      {/* TAB 3: Minhas Consultas & Prontuários */}
      {activeTab === 'consultas' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Histórico de Consultas e Relatórios Médicos
            </h2>
            <button onClick={loadMinhasConsultas} className="text-xs text-teal-700 font-bold hover:underline">
              Atualizar
            </button>
          </div>

          {consultas.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Você ainda não possui consultas agendadas.
            </div>
          ) : (
            <div className="space-y-4">
              {consultas.map((item) => {
                const isDone = item.status === 'CONCLUIDO';
                const isCanceled = item.status === 'CANCELADO';

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-teal-200 transition bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900">{item.medico_nome}</span>
                        <span className="text-xs font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                          {item.especialidade}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isDone ? 'bg-emerald-100 text-emerald-800' : isCanceled ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        Data/Hora: <strong>{item.data_hora}</strong> • {item.tipo_pagamento}
                      </p>

                      {/* Anotações do Prontuário Médico */}
                      {item.anotacoes_medicas && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs">
                          <p className="text-[10px] uppercase font-bold text-teal-800 flex items-center gap-1 mb-1">
                            <FileText className="w-3.5 h-3.5" /> Parecer e Prescrição do Médico:
                          </p>
                          <p className="text-slate-700 font-mono whitespace-pre-wrap">{item.anotacoes_medicas}</p>
                        </div>
                      )}
                    </div>

                    {item.status === 'AGENDADO' && (
                      <div className="shrink-0">
                        <button
                          onClick={() => handleCancelarConsulta(item.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancelar Consulta (RN02)
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

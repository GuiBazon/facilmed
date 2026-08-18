import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';

export default function AgendamentoWizardScreen({ user, onBack, onComplete }) {
  const { theme, isSimplified } = useAccessibility();

  const [step, setStep] = useState(1);
  const [especialidades, setEspecialidades] = useState([]);
  const [selectedEsp, setSelectedEsp] = useState(null);
  const [selectedMedico, setSelectedMedico] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [disponibilidade, setDisponibilidade] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('PARTICULAR');
  const [carteirinha, setCarteirinha] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEspecialidades();
  }, []);

  const loadEspecialidades = async () => {
    try {
      const data = await api.getEspecialidades();
      setEspecialidades(data);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as especialidades.');
    }
  };

  const handleSelectMedico = async (med) => {
    setSelectedMedico(med);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dateStr = amanha.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    await checkDisponibilidade(med.id, dateStr);
    setStep(3);
  };

  const checkDisponibilidade = async (medicoId, dateStr) => {
    setLoading(true);
    try {
      const disp = await api.getDisponibilidade(medicoId, dateStr);
      setDisponibilidade(disp);
      setSelectedTime('');
    } catch (e) {
      Alert.alert('Erro', 'Falha ao consultar grade médica.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTime) {
      Alert.alert('Atenção', 'Selecione um horário disponível.');
      return;
    }

    setLoading(true);
    const dataHora = `${selectedDate} ${selectedTime}:00`;

    try {
      const res = await api.criarAgendamento({
        paciente_id: user?.id || 1,
        medico_id: selectedMedico.id,
        data_hora: dataHora,
        tipo_pagamento: tipoPagamento,
        carteirinha_convenio: tipoPagamento === 'CONVENIO' ? carteirinha : undefined
      });

      Alert.alert('Sucesso!', res.mensagem || 'Consulta confirmada!');
      onComplete();
    } catch (err) {
      Alert.alert('Aviso', err.message || 'Horário indisponível.');
    } finally {
      setLoading(false);
    }
  };

  const handleEntrarFila = async () => {
    try {
      const res = await api.entrarFilaEspera(selectedMedico.id, selectedDate, user?.id || 1);
      Alert.alert('Fila de Espera (RN03)', res.mensagem || 'Você entrou na fila de espera!');
      onComplete();
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  };

  const getDiasProximos = () => {
    const list = [];
    const hoje = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const isDomingo = d.getDay() === 0;
      const iso = d.toISOString().split('T')[0];
      const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
      const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      list.push({ iso, diaSemana, diaMes, isDomingo });
    }
    return list;
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Top Wizard Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : onBack())}
          style={[styles.btnBack, { minHeight: isSimplified ? 54 : 44 }]}
        >
          <Text style={[styles.btnBackText, { fontSize: theme.fontSize.sm }]}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.stepIndicator, { fontSize: theme.fontSize.sm, color: theme.colors.primary }]}>
          Etapa {step} de 4
        </Text>
      </View>

      {/* PASSO 1: Especialidade */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { fontSize: theme.fontSize.xl, color: theme.colors.heading }]}>
            1. Escolha a Especialidade:
          </Text>
          <View style={styles.listCol}>
            {especialidades.map((esp) => (
              <TouchableOpacity
                key={esp.id}
                style={[
                  styles.cardItem,
                  { minHeight: theme.buttonHeight, borderColor: theme.colors.border }
                ]}
                onPress={() => {
                  setSelectedEsp(esp);
                  setStep(2);
                }}
              >
                <Text style={styles.cardEmoji}>🩺</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { fontSize: theme.fontSize.lg }]}>{esp.nome}</Text>
                  <Text style={[styles.cardSub, { fontSize: theme.fontSize.xs }]}>{esp.descricao || 'Atendimento clínico'}</Text>
                </View>
                <Text style={styles.cardArrow}>➔</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* PASSO 2: Médico */}
      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { fontSize: theme.fontSize.xl, color: theme.colors.heading }]}>
            2. Escolha o Médico ({selectedEsp?.nome}):
          </Text>
          <View style={styles.listCol}>
            {(selectedEsp?.medicos || []).map((med) => (
              <TouchableOpacity
                key={med.id}
                style={[
                  styles.cardItem,
                  { minHeight: theme.buttonHeight + 10, borderColor: theme.colors.border }
                ]}
                onPress={() => handleSelectMedico(med)}
              >
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.avatarText}>{med.medico_nome?.charAt(0) || 'M'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { fontSize: theme.fontSize.base }]}>{med.medico_nome}</Text>
                  <Text style={[styles.cardSub, { fontSize: theme.fontSize.xs }]}>CRM: {med.crm}</Text>
                  <Text style={[styles.priceTag, { fontSize: theme.fontSize.xs }]}>
                    Consulta: R$ {Number(med.valor_consulta || 150).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.cardArrow}>➔</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* PASSO 3: Calendário Visual e Horários */}
      {step === 3 && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { fontSize: theme.fontSize.xl, color: theme.colors.heading }]}>
            3. Escolha o Dia e Horário:
          </Text>
          <Text style={[styles.doctorHeader, { fontSize: theme.fontSize.sm, color: theme.colors.primary }]}>
            {selectedMedico?.medico_nome} • {selectedEsp?.nome}
          </Text>

          {/* Calendário Visual */}
          <Text style={[styles.sectionLabel, { fontSize: theme.fontSize.xs }]}>Dias Disponíveis:</Text>
          <View style={styles.calendarRow}>
            {getDiasProximos().map((dia) => {
              const isSelected = selectedDate === dia.iso;
              return (
                <TouchableOpacity
                  key={dia.iso}
                  disabled={dia.isDomingo}
                  style={[
                    styles.calBtn,
                    dia.isDomingo && styles.calBtnDisabled,
                    isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    { minHeight: isSimplified ? 70 : 55 }
                  ]}
                  onPress={() => {
                    setSelectedDate(dia.iso);
                    checkDisponibilidade(selectedMedico.id, dia.iso);
                  }}
                >
                  <Text style={[styles.calDayName, isSelected && { color: '#fff' }]}>{dia.diaSemana}</Text>
                  <Text style={[styles.calDayNum, isSelected && { color: '#fff' }]}>{dia.diaMes}</Text>
                  {dia.isDomingo && <Text style={styles.calClosedText}>Fechado</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Horários Livres */}
          <Text style={[styles.sectionLabel, { fontSize: theme.fontSize.xs, marginTop: 14 }]}>
            Horários Livres para {selectedDate}:
          </Text>

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : disponibilidade?.horarios_livres?.length > 0 ? (
            <View style={styles.timeGrid}>
              {disponibilidade.horarios_livres.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeBtn,
                      isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                      { minHeight: theme.buttonHeight }
                    ]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.timeBtnText, isSelected && { color: '#fff' }, { fontSize: theme.fontSize.base }]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.fullBox}>
              <Text style={[styles.fullBoxText, { fontSize: theme.fontSize.sm }]}>
                Sem horários livres nesta data.
              </Text>
              <TouchableOpacity
                style={[styles.btnFila, { height: theme.buttonHeight }]}
                onPress={handleEntrarFila}
              >
                <Text style={[styles.btnFilaText, { fontSize: theme.fontSize.sm }]}>
                  Entrar na Fila de Espera (RN03)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTime ? (
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { backgroundColor: theme.colors.primary, height: theme.buttonHeight, marginTop: 20 }
              ]}
              onPress={() => setStep(4)}
            >
              <Text style={[styles.btnPrimaryText, { fontSize: theme.fontSize.base }]}>
                Continuar para Pagamento ➔
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* PASSO 4: Pagamento & Confirmação */}
      {step === 4 && (
        <View style={styles.stepContainer}>
          <Text style={[styles.stepTitle, { fontSize: theme.fontSize.xl, color: theme.colors.heading }]}>
            4. Forma de Atendimento:
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLine}>Médico: <Text style={{ fontWeight: 'bold' }}>{selectedMedico?.medico_nome}</Text></Text>
            <Text style={styles.summaryLine}>Especialidade: <Text style={{ fontWeight: 'bold' }}>{selectedEsp?.nome}</Text></Text>
            <Text style={styles.summaryLine}>Data/Hora: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedDate} às {selectedTime}</Text></Text>
          </View>

          <View style={styles.payOptions}>
            <TouchableOpacity
              style={[
                styles.payBtn,
                tipoPagamento === 'PARTICULAR' && styles.payBtnActive,
                { minHeight: theme.buttonHeight }
              ]}
              onPress={() => setTipoPagamento('PARTICULAR')}
            >
              <Text style={[styles.payTitle, { fontSize: theme.fontSize.base }]}>Particular</Text>
              <Text style={[styles.paySub, { fontSize: theme.fontSize.sm }]}>
                R$ {Number(selectedMedico?.valor_consulta || 150).toFixed(2)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payBtn,
                tipoPagamento === 'CONVENIO' && styles.payBtnActive,
                { minHeight: theme.buttonHeight }
              ]}
              onPress={() => setTipoPagamento('CONVENIO')}
            >
              <Text style={[styles.payTitle, { fontSize: theme.fontSize.base }]}>Convênio</Text>
              <Text style={[styles.paySub, { fontSize: theme.fontSize.sm }]}>Unimed, Bradesco, etc.</Text>
            </TouchableOpacity>
          </View>

          {tipoPagamento === 'CONVENIO' && (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.label, { fontSize: theme.fontSize.sm }]}>Número da Carteirinha:</Text>
              <TextInput
                style={[styles.input, { height: theme.buttonHeight, fontSize: theme.fontSize.base }]}
                placeholder="Ex: 0012.3456.7890"
                value={carteirinha}
                onChangeText={setCarteirinha}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              { backgroundColor: theme.colors.primary, height: theme.buttonHeight, marginTop: 24 }
            ]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnPrimaryText, { fontSize: theme.fontSize.base }]}>
                ✓ Confirmar Agendamento
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  btnBack: {
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBackText: {
    fontWeight: 'bold',
    color: '#334155',
  },
  stepIndicator: {
    fontWeight: 'bold',
  },
  stepContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  doctorHeader: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionLabel: {
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  listCol: {
    gap: 10,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    backgroundColor: '#ffffff',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cardSub: {
    color: '#64748b',
    marginTop: 2,
  },
  priceTag: {
    color: '#0d9488',
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardArrow: {
    fontSize: 18,
    color: '#94a3b8',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  calendarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calBtn: {
    flex: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  calBtnDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.5,
  },
  calDayName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
  },
  calDayNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  calClosedText: {
    fontSize: 9,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeBtn: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ccfbf1',
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    fontWeight: 'bold',
    color: '#0f766e',
  },
  fullBox: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
  },
  fullBoxText: {
    color: '#64748b',
    fontWeight: '600',
  },
  btnFila: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFilaText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: '#f0fdfa',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ccfbf1',
    gap: 6,
    marginBottom: 14,
  },
  summaryLine: {
    fontSize: 14,
    color: '#334155',
  },
  payOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  payBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  payBtnActive: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  payTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  paySub: {
    color: '#64748b',
    marginTop: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontWeight: '600',
  },
  label: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  btnPrimary: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
  }
});

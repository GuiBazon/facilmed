import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../contexts/AuthContext';
import { especialidades, medicos, agendamentos, filaEspera } from '../services/api';
import { COLORS, getTheme } from '../services/theme';

const DAY_MAP_REV = { 0: 'DOM', 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB' };
const DAY_MAP_PT = { SEG: 'Segunda', TER: 'Terça', QUA: 'Quarta', QUI: 'Quinta', SEX: 'Sexta', SAB: 'Sábado' };

export default function AgendarScreen() {
  const { user } = useAuth();
  const isSimplified = user?.tipo_interface === 'SIMPLIFICADO';
  const theme = getTheme(isSimplified);

  const [step, setStep] = useState(1);
  const [especialidadesList, setEspecialidadesList] = useState([]);
  const [medicosList, setMedicosList] = useState([]);
  const [selectedEspecialidade, setSelectedEspecialidade] = useState(null);
  const [selectedMedico, setSelectedMedico] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [selectedHorario, setSelectedHorario] = useState(null);
  const [tipoPagamento, setTipoPagamento] = useState('PARTICULAR');
  const [carteirinha, setCarteirinha] = useState('');
  const [loading, setLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadEspecialidades();
  }, []);

  useEffect(() => {
    if (selectedEspecialidade) loadMedicos();
  }, [selectedEspecialidade]);

  useEffect(() => {
    if (selectedMedico && selectedDate) loadHorarios();
  }, [selectedMedico, selectedDate]);

  async function loadEspecialidades() {
    try {
      const res = await especialidades.getAll();
      setEspecialidadesList(res.data);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar especialidades.');
    }
  }

  async function loadMedicos() {
    try {
      const res = await especialidades.getMedicos(selectedEspecialidade.id);
      setMedicosList(res.data);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar médicos.');
    }
  }

  async function loadHorarios() {
    setLoading(true);
    try {
      const res = await medicos.getDisponibilidade(selectedMedico.id, selectedDate);
      setHorarios(res.data.horarios || []);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar horários.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmar() {
    if (!selectedHorario) {
      Alert.alert('Erro', 'Selecione um horário.');
      return;
    }
    setLoading(true);
    try {
      await agendamentos.create({
        medico_id: selectedMedico.id,
        data_hora: selectedHorario.hora_completa,
        tipo_pagamento: tipoPagamento,
        carteirinha_convenio: tipoPagamento === 'CONVENIO' ? carteirinha : undefined,
      });
      Alert.alert('Sucesso', 'Agendamento realizado com sucesso!', [
        { text: 'OK', onPress: () => resetForm() },
      ]);
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Falha ao agendar.';
      Alert.alert('Erro', errMsg, [
        { text: 'Entrar na fila de espera', onPress: () => handleInserirFila() },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleInserirFila() {
    try {
      await filaEspera.inscrever({
        medico_id: selectedMedico.id,
        data_desejada: selectedDate,
      });
      Alert.alert('Fila de Espera', 'Você foi adicionado à fila de espera. Será notificado quando uma vaga abrir.');
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao entrar na fila.');
    }
  }

  function resetForm() {
    setStep(1);
    setSelectedEspecialidade(null);
    setSelectedMedico(null);
    setSelectedDate(null);
    setHorarios([]);
    setSelectedHorario(null);
  }

  const today = new Date().toISOString().split('T')[0];

  const stepLabels = isSimplified
    ? ['Especialidade', 'Médico', 'Dia', 'Horário', 'Confirmar']
    : ['Esp.', 'Médico', 'Dia', 'Horário', 'Conf.'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, theme.title]}>Agendar Consulta</Text>

      <View style={styles.steps}>
        {stepLabels.map((label, i) => (
          <View key={i} style={[styles.stepDot, step === i + 1 && styles.stepDotActive]}>
            <Text style={[styles.stepText, step === i + 1 && styles.stepTextActive, theme.font]}>
              {isSimplified ? label : `${i + 1}`}
            </Text>
          </View>
        ))}
      </View>

      {step === 1 && (
        <View>
          <Text style={[styles.sectionTitle, theme.fontBold]}>Escolha a especialidade</Text>
          {especialidadesList.map((esp) => (
            <TouchableOpacity
              key={esp.id}
              style={[styles.option, { minHeight: theme.buttonHeight }, selectedEspecialidade?.id === esp.id && styles.optionSelected]}
              onPress={() => { setSelectedEspecialidade(esp); setStep(2); }}
            >
              <Text style={[styles.optionTitle, theme.fontBold]}>{esp.nome}</Text>
              {esp.descricao && <Text style={[styles.optionDesc, theme.font]}>{esp.descricao}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={[styles.sectionTitle, theme.fontBold]}>Escolha o médico</Text>
          {medicosList.map((med) => (
            <TouchableOpacity
              key={med.id}
              style={[styles.option, { minHeight: theme.buttonHeight }, selectedMedico?.id === med.id && styles.optionSelected]}
              onPress={() => { setSelectedMedico(med); setStep(3); }}
            >
              <Text style={[styles.optionTitle, theme.fontBold]}>{med.nome}</Text>
              <Text style={[styles.optionDesc, theme.font]}>CRM: {med.crm} | R$ {med.valor_consulta}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
            <Text style={[styles.backBtnText, theme.font]}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={[styles.sectionTitle, theme.fontBold]}>Escolha o dia</Text>
          <Calendar
            minDate={today}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setStep(4);
            }}
            theme={{
              todayTextColor: COLORS.primary,
              selectedDayBackgroundColor: COLORS.primary,
              arrowColor: COLORS.primary,
            }}
            markedDates={{
              ...markedDates,
              [selectedDate]: { selected: true, selectedColor: COLORS.primary },
            }}
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
            <Text style={[styles.backBtnText, theme.font]}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={[styles.sectionTitle, theme.fontBold]}>
            Horários para {selectedDate}
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <View style={styles.horariosGrid}>
              {horarios.map((h, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.horarioBtn,
                    h.ocupado && styles.horarioOcupado,
                    selectedHorario?.hora === h.hora && styles.horarioSelected,
                    { minHeight: theme.buttonHeight },
                  ]}
                  onPress={() => !h.ocupado && setSelectedHorario(h)}
                  disabled={h.ocupado}
                >
                  <Text style={[
                    styles.horarioText,
                    h.ocupado && styles.horarioTextOcupado,
                    selectedHorario?.hora === h.hora && styles.horarioTextSelected,
                    theme.font,
                  ]}>
                    {h.hora}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {selectedHorario && (
            <TouchableOpacity style={[styles.nextBtn, { height: theme.buttonHeight }]} onPress={() => setStep(5)}>
              <Text style={[styles.nextBtnText, { fontSize: theme.buttonFontSize }]}>Próximo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
            <Text style={[styles.backBtnText, theme.font]}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 5 && (
        <View>
          <Text style={[styles.sectionTitle, theme.fontBold]}>Confirmar Agendamento</Text>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryText, theme.font]}>Médico: {selectedMedico?.nome}</Text>
            <Text style={[styles.summaryText, theme.font]}>Especialidade: {selectedEspecialidade?.nome}</Text>
            <Text style={[styles.summaryText, theme.font]}>Data: {selectedDate}</Text>
            <Text style={[styles.summaryText, theme.font]}>Horário: {selectedHorario?.hora}</Text>
            <Text style={[styles.summaryText, theme.font]}>Valor: R$ {selectedMedico?.valor_consulta}</Text>
          </View>

          <Text style={[styles.label, theme.fontBold]}>Tipo de Pagamento</Text>
          <View style={styles.pagamentoRow}>
            <TouchableOpacity
              style={[styles.pagamentoBtn, tipoPagamento === 'PARTICULAR' && styles.pagamentoSelected]}
              onPress={() => setTipoPagamento('PARTICULAR')}
            >
              <Text style={[styles.pagamentoText, theme.font]}>Particular</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pagamentoBtn, tipoPagamento === 'CONVENIO' && styles.pagamentoSelected]}
              onPress={() => setTipoPagamento('CONVENIO')}
            >
              <Text style={[styles.pagamentoText, theme.font]}>Convênio</Text>
            </TouchableOpacity>
          </View>

          {tipoPagamento === 'CONVENIO' && (
            <>
              <Text style={[styles.label, theme.fontBold]}>Número da Carteirinha</Text>
              <TextInput
                style={[styles.input, theme.font]}
                value={carteirinha}
                onChangeText={setCarteirinha}
                placeholder="Digite o número"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, { height: theme.buttonHeight }]}
            onPress={handleConfirmar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.confirmBtnText, { fontSize: theme.buttonFontSize }]}>Confirmar Agendamento</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(4)}>
            <Text style={[styles.backBtnText, theme.font]}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: COLORS.primary, textAlign: 'center', marginBottom: 16 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  stepDot: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepText: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 14 },
  stepTextActive: { color: '#fff' },
  sectionTitle: { color: COLORS.text, marginBottom: 16, fontSize: 18 },
  option: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  optionTitle: { color: COLORS.text, fontSize: 16 },
  optionDesc: { color: COLORS.textSecondary, marginTop: 4 },
  horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  horarioBtn: {
    width: '30%', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface,
  },
  horarioOcupado: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  horarioSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  horarioText: { color: COLORS.text },
  horarioTextOcupado: { color: COLORS.textLight, textDecorationLine: 'line-through' },
  horarioTextSelected: { color: '#fff' },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  nextBtnText: { color: '#fff', fontWeight: 'bold' },
  backBtn: { marginTop: 12, alignItems: 'center' },
  backBtnText: { color: COLORS.primary },
  summaryCard: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  summaryText: { color: COLORS.text, marginBottom: 4 },
  label: { color: COLORS.text, marginBottom: 4, marginTop: 12 },
  pagamentoRow: { flexDirection: 'row', gap: 12 },
  pagamentoBtn: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  pagamentoSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  pagamentoText: { color: COLORS.text },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, fontSize: 16,
  },
  confirmBtn: {
    backgroundColor: COLORS.secondary, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' },
});

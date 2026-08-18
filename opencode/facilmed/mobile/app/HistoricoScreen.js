import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { agendamentos } from '../services/api';
import { COLORS, getTheme } from '../services/theme';

export default function HistoricoScreen() {
  const { user } = useAuth();
  const isSimplified = user?.tipo_interface === 'SIMPLIFICADO';
  const theme = getTheme(isSimplified);

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadAgendamentos();
    }, [])
  );

  async function loadAgendamentos() {
    setLoading(true);
    try {
      const res = await agendamentos.getPorPaciente();
      setLista(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelar(item) {
    Alert.alert(
      'Cancelar Agendamento',
      `Deseja cancelar a consulta com ${item.medico_nome} em ${new Date(item.data_hora).toLocaleString('pt-BR')}?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await agendamentos.cancelar(item.id);
              Alert.alert('Sucesso', 'Agendamento cancelado.');
              loadAgendamentos();
            } catch (error) {
              Alert.alert('Erro', error.response?.data?.error || 'Falha ao cancelar.');
            }
          },
        },
      ]
    );
  }

  const statusColors = {
    AGENDADO: COLORS.primary,
    CONCLUIDO: COLORS.secondary,
    CANCELADO: COLORS.danger,
    NAO_COMPARECEU: COLORS.warning,
  };

  function renderItem({ item }) {
    const dataHora = new Date(item.data_hora);
    const podeCancelar = item.status === 'AGENDADO' && (dataHora - new Date()) > 30 * 60 * 1000;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, theme.fontBold]}>{item.medico_nome}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || COLORS.grayDark }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.cardDetail, theme.font]}>Especialidade: {item.especialidade_nome}</Text>
        <Text style={[styles.cardDetail, theme.font]}>Data: {dataHora.toLocaleDateString('pt-BR')}</Text>
        <Text style={[styles.cardDetail, theme.font]}>Horário: {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={[styles.cardDetail, theme.font]}>Pagamento: {item.tipo_pagamento}</Text>

        {item.anotacoes_medicas && (
          <View style={styles.anotacoesBox}>
            <Text style={[styles.anotacoesLabel, theme.fontBold]}>Relatório Médico:</Text>
            <Text style={[styles.anotacoesText, theme.font]}>{item.anotacoes_medicas}</Text>
          </View>
        )}

        {podeCancelar && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelar(item)}>
            <Text style={[styles.cancelBtnText, theme.font]}>Cancelar Consulta</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, theme.title]}>Histórico de Consultas</Text>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : lista.length === 0 ? (
        <Text style={[styles.emptyText, theme.font]}>Nenhuma consulta encontrada.</Text>
      ) : (
        <FlatList
          data={lista}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { color: COLORS.primary, textAlign: 'center', padding: 20 },
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: COLORS.text, fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  cardDetail: { color: COLORS.textSecondary, marginBottom: 2 },
  anotacoesBox: { marginTop: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 8 },
  anotacoesLabel: { color: COLORS.secondary, marginBottom: 4 },
  anotacoesText: { color: COLORS.text },
  cancelBtn: { marginTop: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: COLORS.danger, fontWeight: 'bold' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
});

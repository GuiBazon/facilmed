import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';

export default function MinhasConsultasScreen({ user, onBack }) {
  const { theme, isSimplified } = useAccessibility();
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAgendamentos(user?.id);
      setConsultas(data);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar suas consultas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelar = (id) => {
    Alert.alert(
      'Cancelar Consulta',
      'Deseja realmente cancelar este agendamento?',
      [
        { text: 'Não', style: 'cancel' },
        { 
          text: 'Sim, Cancelar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.cancelarAgendamento(id);
              Alert.alert('Sucesso', res.mensagem || 'Consulta cancelada.');
              loadData();
            } catch (err) {
              Alert.alert('Bloqueio do Sistema (RN02)', err.message);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.btnBack, { minHeight: isSimplified ? 54 : 44 }]}
        >
          <Text style={[styles.btnBackText, { fontSize: theme.fontSize.sm }]}>← Início</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: theme.fontSize.lg, color: theme.colors.heading }]}>
          Minhas Consultas
        </Text>
        <TouchableOpacity onPress={loadData}>
          <Text style={[styles.refreshText, { fontSize: theme.fontSize.xs, color: theme.colors.primary }]}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : consultas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={[styles.emptyTitle, { fontSize: theme.fontSize.base }]}>Nenhuma consulta encontrada</Text>
          <Text style={[styles.emptySub, { fontSize: theme.fontSize.xs }]}>Você ainda não possui atendimentos marcados.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {consultas.map((item) => {
            const isDone = item.status === 'CONCLUIDO';
            const isCanceled = item.status === 'CANCELADO';

            return (
              <View 
                key={item.id} 
                style={[
                  styles.card, 
                  { borderColor: theme.colors.border, minHeight: isSimplified ? 120 : 90 }
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.doctorName, { fontSize: theme.fontSize.base }]}>
                    {item.medico_nome}
                  </Text>
                  <View style={[
                    styles.badge, 
                    isDone ? styles.badgeDone : isCanceled ? styles.badgeCanceled : styles.badgePending
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      isDone ? styles.badgeDoneText : isCanceled ? styles.badgeCanceledText : styles.badgePendingText
                    ]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.specialty, { fontSize: theme.fontSize.sm, color: theme.colors.primary }]}>
                  {item.especialidade} • CRM {item.crm}
                </Text>

                <Text style={[styles.dateTime, { fontSize: theme.fontSize.sm }]}>
                  📅 Data/Hora: <Text style={{ fontWeight: 'bold' }}>{item.data_hora}</Text>
                </Text>
                <Text style={[styles.payType, { fontSize: theme.fontSize.xs }]}>
                  Tipo: {item.tipo_pagamento} {item.carteirinha_convenio ? `(Cart: ${item.carteirinha_convenio})` : ''}
                </Text>

                {/* Prontuário Médico Parecer */}
                {item.anotacoes_medicas && (
                  <View style={styles.prontuarioBox}>
                    <Text style={styles.prontuarioTitle}>📝 Parecer e Prescrição Médica:</Text>
                    <Text style={[styles.prontuarioContent, { fontSize: theme.fontSize.xs }]}>
                      {item.anotacoes_medicas}
                    </Text>
                  </View>
                )}

                {item.status === 'AGENDADO' && (
                  <TouchableOpacity
                    style={[styles.btnCancel, { minHeight: theme.buttonHeight }]}
                    onPress={() => handleCancelar(item.id)}
                  >
                    <Text style={[styles.btnCancelText, { fontSize: theme.fontSize.sm }]}>
                      Cancelar Consulta (RN02)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
    paddingHorizontal: 14,
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
  title: {
    fontWeight: 'bold',
  },
  refreshText: {
    fontWeight: 'bold',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorName: {
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeDone: {
    backgroundColor: '#d1fae5',
  },
  badgeDoneText: {
    color: '#065f46',
    fontWeight: 'bold',
    fontSize: 10,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgePendingText: {
    color: '#92400e',
    fontWeight: 'bold',
    fontSize: 10,
  },
  badgeCanceled: {
    backgroundColor: '#ffe4e6',
  },
  badgeCanceledText: {
    color: '#9f1239',
    fontWeight: 'bold',
    fontSize: 10,
  },
  specialty: {
    fontWeight: 'bold',
  },
  dateTime: {
    color: '#334155',
    marginTop: 2,
  },
  payType: {
    color: '#64748b',
  },
  prontuarioBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  prontuarioTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 2,
  },
  prontuarioContent: {
    color: '#334155',
    fontStyle: 'italic',
  },
  btnCancel: {
    marginTop: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    color: '#b91c1c',
    fontWeight: 'bold',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#334155',
  },
  emptySub: {
    color: '#94a3b8',
    marginTop: 4,
  }
});

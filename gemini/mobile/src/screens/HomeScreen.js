import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView 
} from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';

export default function HomeScreen({ user, onNavigate, onLogout }) {
  const { theme, isSimplified, toggleMode } = useAccessibility();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.greeting, { fontSize: theme.fontSize.lg }]}>
          Olá, {user?.nome?.split(' ')[0] || 'Paciente'}! 👋
        </Text>
        <Text style={[styles.headerSub, { fontSize: theme.fontSize.sm }]}>
          O que você deseja fazer hoje no FácilMed?
        </Text>
      </View>

      {/* Senior Mode Toggle Card */}
      <TouchableOpacity
        style={[
          styles.toggleCard,
          isSimplified && styles.toggleCardActive,
          { minHeight: theme.buttonHeight }
        ]}
        onPress={toggleMode}
      >
        <Text style={[styles.toggleIcon]}>{isSimplified ? '🔍' : '👓'}</Text>
        <View style={styles.toggleTextContainer}>
          <Text style={[styles.toggleTitle, { fontSize: theme.fontSize.base }]}>
            {isSimplified ? 'Modo Simplificado (Idosos) Ativo' : 'Ativar Modo Simplificado'}
          </Text>
          <Text style={[styles.toggleDesc, { fontSize: theme.fontSize.xs }]}>
            {isSimplified ? 'Toque para voltar ao visual padrão' : 'Letras maiores e botões largos de fácil toque'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Main Action Grid */}
      <View style={styles.menuGrid}>
        
        {/* Agendar Consulta */}
        <TouchableOpacity
          style={[
            styles.menuBtn,
            styles.menuBtnBooking,
            { minHeight: isSimplified ? 100 : 80, borderColor: theme.colors.border }
          ]}
          onPress={() => onNavigate('agendar')}
        >
          <View style={styles.menuBtnIconCircle}>
            <Text style={styles.menuBtnEmoji}>📅</Text>
          </View>
          <View style={styles.menuBtnTextCol}>
            <Text style={[styles.menuBtnTitle, { fontSize: theme.fontSize.lg }]}>
              Marcar Nova Consulta
            </Text>
            <Text style={[styles.menuBtnDesc, { fontSize: theme.fontSize.xs }]}>
              Passo a passo por especialidade e médico
            </Text>
          </View>
        </TouchableOpacity>

        {/* Chat com a Sofia (IA) */}
        <TouchableOpacity
          style={[
            styles.menuBtn,
            styles.menuBtnChat,
            { minHeight: isSimplified ? 100 : 80, borderColor: '#f472b6' }
          ]}
          onPress={() => onNavigate('chat')}
        >
          <View style={[styles.menuBtnIconCircle, { backgroundColor: '#fdf2f8' }]}>
            <Text style={styles.menuBtnEmoji}>💬</Text>
          </View>
          <View style={styles.menuBtnTextCol}>
            <Text style={[styles.menuBtnTitle, { fontSize: theme.fontSize.lg, color: '#9d174d' }]}>
              Falar com a Secretária Sofia (IA)
            </Text>
            <Text style={[styles.menuBtnDesc, { fontSize: theme.fontSize.xs, color: '#be185d' }]}>
              Verifique horários e agende por mensagem
            </Text>
          </View>
        </TouchableOpacity>

        {/* Minhas Consultas */}
        <TouchableOpacity
          style={[
            styles.menuBtn,
            styles.menuBtnHistory,
            { minHeight: isSimplified ? 100 : 80, borderColor: theme.colors.border }
          ]}
          onPress={() => onNavigate('consultas')}
        >
          <View style={[styles.menuBtnIconCircle, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.menuBtnEmoji}>📋</Text>
          </View>
          <View style={styles.menuBtnTextCol}>
            <Text style={[styles.menuBtnTitle, { fontSize: theme.fontSize.lg }]}>
              Minhas Consultas e Prontuário
            </Text>
            <Text style={[styles.menuBtnDesc, { fontSize: theme.fontSize.xs }]}>
              Histórico, parecer médico e cancelamentos
            </Text>
          </View>
        </TouchableOpacity>

      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.btnLogout, { height: theme.buttonHeight }]}
        onPress={onLogout}
      >
        <Text style={[styles.btnLogoutText, { fontSize: theme.fontSize.sm }]}>
          Sair da Conta
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  headerBanner: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  greeting: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#ccfbf1',
    marginTop: 4,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 12,
  },
  toggleCardActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  toggleIcon: {
    fontSize: 24,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  toggleDesc: {
    color: '#64748b',
    marginTop: 2,
  },
  menuGrid: {
    gap: 14,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  menuBtnBooking: {
    borderColor: '#ccfbf1',
  },
  menuBtnChat: {
    backgroundColor: '#fff1f2',
  },
  menuBtnHistory: {
    borderColor: '#e2e8f0',
  },
  menuBtnIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnEmoji: {
    fontSize: 24,
  },
  menuBtnTextCol: {
    flex: 1,
  },
  menuBtnTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  menuBtnDesc: {
    color: '#64748b',
    marginTop: 2,
  },
  btnLogout: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
    borderRadius: 16,
  },
  btnLogoutText: {
    fontWeight: 'bold',
    color: '#b91c1c',
  },
});

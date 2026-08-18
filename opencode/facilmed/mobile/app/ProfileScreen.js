import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, getTheme } from '../services/theme';

export default function ProfileScreen() {
  const { user, logout, toggleInterface } = useAuth();
  const isSimplified = user?.tipo_interface === 'SIMPLIFICADO';
  const theme = getTheme(isSimplified);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, theme.title]}>Meu Perfil</Text>

      <View style={styles.card}>
        <Text style={[styles.label, theme.fontBold]}>Nome</Text>
        <Text style={[styles.value, theme.font]}>{user?.nome}</Text>

        <Text style={[styles.label, theme.fontBold]}>CPF</Text>
        <Text style={[styles.value, theme.font]}>{user?.cpf}</Text>

        <Text style={[styles.label, theme.fontBold]}>Telefone</Text>
        <Text style={[styles.value, theme.font]}>{user?.telefone}</Text>

        <Text style={[styles.label, theme.fontBold]}>Modo de Interface</Text>
        <Text style={[styles.value, theme.font]}>{isSimplified ? 'Simplificado (Acessibilidade)' : 'Padrão'}</Text>
      </View>

      <TouchableOpacity style={[styles.button, { height: theme.buttonHeight }]} onPress={toggleInterface}>
        <Text style={[styles.buttonText, { fontSize: theme.buttonFontSize }]}>
          {isSimplified ? 'Mudar para Modo Padrão' : 'Mudar para Modo Simplificado'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutBtn, { height: theme.buttonHeight }]}
        onPress={() => {
          Alert.alert('Sair', 'Deseja sair da sua conta?', [
            { text: 'Não', style: 'cancel' },
            { text: 'Sim', onPress: logout },
          ]);
        }}
      >
        <Text style={[styles.logoutBtnText, { fontSize: theme.buttonFontSize }]}>Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  title: { color: COLORS.primary, textAlign: 'center', marginBottom: 24 },
  card: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 20, marginBottom: 20,
  },
  label: { color: COLORS.primary, marginTop: 8 },
  value: { color: COLORS.text, marginBottom: 4 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: COLORS.danger, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  logoutBtnText: { color: '#fff', fontWeight: 'bold' },
});

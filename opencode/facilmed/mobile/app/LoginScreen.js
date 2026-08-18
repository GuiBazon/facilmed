import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, getTheme } from '../services/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const isSimplified = false;
  const theme = getTheme(isSimplified);

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!cpf || !senha) {
      Alert.alert('Erro', 'Preencha CPF e senha.');
      return;
    }
    setLoading(true);
    try {
      await login(cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), senha);
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  function formatCpf(text) {
    const cleaned = text.replace(/\D/g, '').substring(0, 11);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.logo, theme.title]}>FacilMed</Text>
          <Text style={[styles.subtitle, theme.font]}>Agendamento de Consultas</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, theme.fontBold]}>CPF</Text>
          <TextInput
            style={[styles.input, theme.font]}
            placeholder="000.000.000-00"
            value={cpf}
            onChangeText={(t) => setCpf(formatCpf(t))}
            keyboardType="numeric"
            maxLength={14}
          />

          <Text style={[styles.label, theme.fontBold]}>Senha</Text>
          <TextInput
            style={[styles.input, theme.font]}
            placeholder="Digite sua senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, { height: theme.buttonHeight }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { fontSize: theme.buttonFontSize }]}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.link, theme.font]}>Não tem conta? Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { color: COLORS.primary, fontSize: 36, fontWeight: 'bold' },
  subtitle: { color: COLORS.textSecondary, marginTop: 8 },
  form: { gap: 12 },
  label: { color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { color: COLORS.primary, textAlign: 'center', marginTop: 16 },
});

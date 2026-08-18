import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, getTheme } from '../services/theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoInterface, setTipoInterface] = useState('PADRAO');
  const [loading, setLoading] = useState(false);

  function formatCpf(text) {
    const cleaned = text.replace(/\D/g, '').substring(0, 11);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }

  function formatPhone(text) {
    const cleaned = text.replace(/\D/g, '').substring(0, 11);
    if (cleaned.length <= 2) return cleaned.length ? `(${cleaned}` : '';
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  async function handleRegister() {
    if (!nome || !cpf || !telefone || !senha) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await register({
        nome,
        cpf,
        telefone,
        senha,
        tipo_usuario: 'PACIENTE',
        tipo_interface: tipoInterface,
      });
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  const isSimplified = tipoInterface === 'SIMPLIFICADO';
  const theme = getTheme(isSimplified);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, theme.title]}>Cadastro</Text>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, theme.font]}>Modo Simplificado</Text>
          <Switch
            value={isSimplified}
            onValueChange={(v) => setTipoInterface(v ? 'SIMPLIFICADO' : 'PADRAO')}
            trackColor={{ true: COLORS.primary, false: COLORS.border }}
          />
        </View>

        <Text style={[styles.label, theme.fontBold]}>Nome completo</Text>
        <TextInput style={[styles.input, theme.font]} value={nome} onChangeText={setNome} placeholder="Seu nome" />

        <Text style={[styles.label, theme.fontBold]}>CPF</Text>
        <TextInput style={[styles.input, theme.font]} value={cpf} onChangeText={(t) => setCpf(formatCpf(t))} keyboardType="numeric" maxLength={14} placeholder="000.000.000-00" />

        <Text style={[styles.label, theme.fontBold]}>Telefone</Text>
        <TextInput style={[styles.input, theme.font]} value={telefone} onChangeText={(t) => setTelefone(formatPhone(t))} keyboardType="phone-pad" maxLength={15} placeholder="(00) 00000-0000" />

        <Text style={[styles.label, theme.fontBold]}>Senha</Text>
        <TextInput style={[styles.input, theme.font]} value={senha} onChangeText={setSenha} secureTextEntry placeholder="Crie uma senha" />

        <TouchableOpacity style={[styles.button, { height: theme.buttonHeight }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, { fontSize: theme.buttonFontSize }]}>Cadastrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.link, theme.font]}>Já tem conta? Faça login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 24 },
  title: { color: COLORS.primary, textAlign: 'center', marginBottom: 24 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: COLORS.surface, padding: 16, borderRadius: 12 },
  switchLabel: { color: COLORS.text },
  label: { color: COLORS.text, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16 },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { color: COLORS.primary, textAlign: 'center', marginTop: 16, marginBottom: 32 },
});

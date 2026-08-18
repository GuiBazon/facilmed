import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'lucide-react-native' ? require('react-native') : require('react-native');
import { api, setAuthToken } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';

export default function LoginScreen({ onLoginSuccess }) {
  const { theme, isSimplified, setIsSimplified } = useAccessibility();
  const [cpf, setCpf] = useState('111.111.111-11');
  const [senha, setSenha] = useState('123');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const handleLogin = async () => {
    if (!cpf || !senha) {
      Alert.alert('Atenção', 'Informe seu CPF e senha para entrar.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const res = await api.register({
          cpf,
          senha,
          nome,
          telefone,
          tipo_interface: isSimplified ? 'SIMPLIFICADO' : 'PADRAO'
        });
        setAuthToken(res.token);
        setIsSimplified(res.usuario.tipo_interface === 'SIMPLIFICADO');
        onLoginSuccess(res.usuario);
      } else {
        const res = await api.login(cpf, senha);
        setAuthToken(res.token);
        setIsSimplified(res.usuario.tipo_interface === 'SIMPLIFICADO');
        onLoginSuccess(res.usuario);
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const setDemo = (demoCpf, simplified) => {
    setCpf(demoCpf);
    setSenha('123');
    setIsSimplified(simplified);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { borderColor: theme.colors.border }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoIcon, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.logoIconText}>✚</Text>
          </View>
          <Text style={[styles.title, { fontSize: theme.fontSize.xxl, color: theme.colors.heading }]}>
            Fácil<Text style={{ color: theme.colors.primary }}>Med</Text>
          </Text>
          <Text style={[styles.subtitle, { fontSize: theme.fontSize.sm, color: theme.colors.text }]}>
            {isSimplified ? 'Modo Fácil para Idosos' : 'Agendamento e Saúde Inteligente'}
          </Text>
        </View>

        {/* Inputs */}
        <View style={styles.form}>
          {isRegister && (
            <>
              <Text style={[styles.label, { fontSize: theme.fontSize.sm }]}>Seu Nome:</Text>
              <TextInput
                style={[styles.input, { height: theme.buttonHeight, fontSize: theme.fontSize.base }]}
                placeholder="Ex: Carlos Silva"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={[styles.label, { fontSize: theme.fontSize.sm }]}>Telefone / WhatsApp:</Text>
              <TextInput
                style={[styles.input, { height: theme.buttonHeight, fontSize: theme.fontSize.base }]}
                placeholder="(11) 99999-9999"
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />
            </>
          )}

          <Text style={[styles.label, { fontSize: theme.fontSize.sm }]}>CPF:</Text>
          <TextInput
            style={[styles.input, { height: theme.buttonHeight, fontSize: theme.fontSize.base }]}
            placeholder="000.000.000-00"
            value={cpf}
            onChangeText={setCpf}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { fontSize: theme.fontSize.sm }]}>Senha:</Text>
          <TextInput
            style={[styles.input, { height: theme.buttonHeight, fontSize: theme.fontSize.base }]}
            placeholder="••••••"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          {/* Accessibility Mode Switch in Login */}
          <TouchableOpacity
            style={[
              styles.modeToggle,
              isSimplified && styles.modeToggleActive,
              { minHeight: theme.buttonHeight }
            ]}
            onPress={() => setIsSimplified(!isSimplified)}
          >
            <Text style={[styles.modeToggleText, { fontSize: theme.fontSize.sm }]}>
              {isSimplified ? '✓ Modo Simplificado (Letras Grandes) Ativo' : 'Ativar Modo Simplificado (Idosos)'}
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.btnPrimary,
              { backgroundColor: theme.colors.primary, height: theme.buttonHeight }
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnPrimaryText, { fontSize: theme.fontSize.base }]}>
                {isRegister ? 'Cadastrar' : 'Entrar no Aplicativo'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={styles.btnToggleRegister}>
            <Text style={[styles.btnToggleRegisterText, { fontSize: theme.fontSize.xs, color: theme.colors.primary }]}>
              {isRegister ? 'Já tenho cadastro. Fazer Login' : 'Novo por aqui? Criar conta rápida'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Fast Access */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Acessos de Teste:</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => setDemo('111.111.111-11', false)}
            >
              <Text style={styles.demoBtnText}>Carlos (Padrão)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnSenior]}
              onPress={() => setDemo('222.222.222-22', true)}
            >
              <Text style={styles.demoBtnSeniorText}>Dona Maria (Sênior)</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoIconText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '600',
    marginTop: 4,
  },
  form: {
    gap: 10,
  },
  label: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
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
  modeToggle: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginVertical: 4,
  },
  modeToggleActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
  },
  modeToggleText: {
    fontWeight: 'bold',
    color: '#78350f',
  },
  btnPrimary: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  btnToggleRegister: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  btnToggleRegisterText: {
    fontWeight: 'bold',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  demoBtnSenior: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  demoBtnSeniorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
  }
});

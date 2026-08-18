import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';

export default function ChatSofiaScreen({ user, onBack }) {
  const { theme, isSimplified } = useAccessibility();
  const scrollViewRef = useRef();

  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: `Olá ${user?.nome ? user.nome.split(' ')[0] : ''}! Sou a Sofia, secretária virtual autônoma do FácilMed. Como posso te ajudar hoje? Posso consultar horários livres, marcar consultas ou cancelar agendamentos.`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMsg = inputText.trim();
    setInputText('');

    const newHistory = [...messages, { role: 'user', text: userMsg }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await api.enviarChat(userMsg, messages, user?.id || 1);
      setMessages([
        ...newHistory,
        {
          role: 'model',
          text: res.resposta,
          acoes: res.acoes_executadas
        }
      ]);
    } catch (err) {
      setMessages([
        ...newHistory,
        {
          role: 'model',
          text: 'Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (txt) => {
    setInputText(txt);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={onBack} style={styles.btnBack}>
          <Text style={styles.btnBackText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { fontSize: theme.fontSize.base }]}>
            Secretária Sofia (IA) 🤖
          </Text>
          <Text style={styles.headerSub}>Google Gemini 2.5 Flash • Tool Calling</Text>
        </View>
      </View>

      {/* Messages Scroll */}
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContainer}
      >
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <View 
              key={idx} 
              style={[
                styles.bubbleWrapper, 
                isUser ? styles.bubbleUserWrapper : styles.bubbleModelWrapper
              ]}
            >
              <View 
                style={[
                  styles.bubble, 
                  isUser 
                    ? [styles.bubbleUser, { backgroundColor: theme.colors.primary }] 
                    : styles.bubbleModel,
                  { minHeight: isSimplified ? 54 : 42 }
                ]}
              >
                <Text 
                  style={[
                    styles.bubbleText, 
                    isUser ? styles.bubbleUserText : styles.bubbleModelText,
                    { fontSize: theme.fontSize.base }
                  ]}
                >
                  {m.text}
                </Text>
              </View>

              {m.acoes && m.acoes.length > 0 && (
                <View style={styles.actionTagsContainer}>
                  {m.acoes.map((ac, aIdx) => (
                    <Text key={aIdx} style={styles.actionTagText}>
                      ⚙️ Executou: {ac.tool}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={[styles.loadingText, { fontSize: theme.fontSize.xs }]}>
              Sofia está consultando o FácilMed...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts */}
      <View style={styles.quickPromptsRow}>
        <TouchableOpacity 
          style={styles.quickPromptBtn} 
          onPress={() => handleQuickPrompt('Quais horários livres para Cardiologista amanhã?')}
        >
          <Text style={styles.quickPromptText}>🕒 Horários Cardiologista</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickPromptBtn} 
          onPress={() => handleQuickPrompt('Quero cancelar minha consulta marcada')}
        >
          <Text style={styles.quickPromptText}>❌ Cancelar Consulta</Text>
        </TouchableOpacity>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={[
            styles.input, 
            { height: theme.buttonHeight, fontSize: theme.fontSize.base }
          ]}
          placeholder="Digite sua mensagem para a Sofia..."
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity 
          style={[
            styles.btnSend, 
            { backgroundColor: theme.colors.primary, height: theme.buttonHeight, width: theme.buttonHeight }
          ]}
          onPress={handleSend}
          disabled={loading || !inputText.trim()}
        >
          <Text style={styles.btnSendText}>➤</Text>
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  btnBack: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  btnBackText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#ccfbf1',
    fontSize: 10,
  },
  messagesContainer: {
    padding: 16,
    gap: 12,
  },
  bubbleWrapper: {
    marginBottom: 4,
  },
  bubbleUserWrapper: {
    alignItems: 'flex-end',
  },
  bubbleModelWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    lineHeight: 22,
  },
  bubbleUserText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  bubbleModelText: {
    color: '#1e293b',
    fontWeight: '500',
  },
  actionTagsContainer: {
    marginTop: 4,
    gap: 2,
  },
  actionTagText: {
    fontSize: 10,
    color: '#0f766e',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingText: {
    color: '#64748b',
    fontWeight: '600',
  },
  quickPromptsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    backgroundColor: '#f1f5f9',
  },
  quickPromptBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickPromptText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontWeight: '600',
  },
  btnSend: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSendText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  }
});

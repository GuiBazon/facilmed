import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { chat } from '../services/api';
import { COLORS, getTheme } from '../services/theme';

export default function ChatScreen() {
  const { user } = useAuth();
  const isSimplified = user?.tipo_interface === 'SIMPLIFICADO';
  const theme = getTheme(isSimplified);

  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', text: 'Olá! Eu sou a Sofia, sua secretária virtual do FacilMed. Como posso ajudar você hoje? 😊' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    const userText = input.trim();
    setInput('');
    setLoading(true);

    try {
      const allMessages = [...messages, userMsg].map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.text,
      }));

      const res = await chat.enviar(allMessages, user.id);

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.data.response || 'Desculpe, não consegui processar sua mensagem.',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function renderMessage({ item }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {!isUser && <Text style={styles.botName}>Sofia</Text>}
        <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAssistant, theme.font]}>
          {item.text}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, theme.fontBold]}>Secretária Virtual Sofia</Text>
        <Text style={[styles.headerSubtitle, { fontSize: isSimplified ? 16 : 12 }]}>Online</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={[styles.loadingText, theme.font]}>Sofia está digitando...</Text>
        </View>
      )}

      <View style={[styles.inputRow, { minHeight: isSimplified ? 64 : 56 }]}>
        <TextInput
          style={[styles.input, theme.font, { minHeight: isSimplified ? 56 : 44 }]}
          value={input}
          onChangeText={setInput}
          placeholder="Digite sua mensagem..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading || !input.trim()}>
          <Text style={styles.sendBtnText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 48,
  },
  headerTitle: { color: '#fff', fontSize: 18 },
  headerSubtitle: { color: '#D1FAE5', marginTop: 2 },
  messageList: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '80%', marginBottom: 12, borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: COLORS.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  botName: { fontSize: 11, color: COLORS.primary, fontWeight: 'bold', marginBottom: 2 },
  messageText: { lineHeight: 20 },
  messageTextUser: { color: '#fff' },
  messageTextAssistant: { color: COLORS.text },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  loadingText: { color: COLORS.textSecondary },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
    gap: 8,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12,
    justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontWeight: 'bold' },
});

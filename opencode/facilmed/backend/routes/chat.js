const express = require('express');
const { processarChat } = require('../services/chatService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { messages, paciente_id } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'O array "messages" é obrigatório e deve conter pelo menos uma mensagem.' });
    }

    const userId = paciente_id || req.user.id;

    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      text: msg.text || msg.content || '',
    }));

    if (formattedMessages.length === 1) {
      formattedMessages.unshift({ role: 'user', text: `Paciente ID: ${userId}. ` });
    }

    console.log(`[Chat] Processando ${formattedMessages.length} mensagens para paciente ${userId}`);

    const result = await processarChat(formattedMessages);

    res.json(result);
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro ao processar mensagem com a IA. Verifique a configuração do Gemini.' });
  }
});

module.exports = router;

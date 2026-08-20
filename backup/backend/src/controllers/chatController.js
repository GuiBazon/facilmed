const { processarChatMedIA } = require('../services/aiService');

async function handleChat(req, res) {
  try {
    const { mensagem, historico, paciente_id } = req.body;
    if (!mensagem) {
      return res.status(400).json({ error: 'Mensagem é obrigatória.' });
    }

    const resultado = await processarChatMedIA(mensagem, historico || [], paciente_id || 1);
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  handleChat
};

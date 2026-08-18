const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Usuario = require('../models/Usuario');

const router = express.Router();

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const { senha, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.put('/interface', authenticateToken, async (req, res) => {
  try {
    const { tipo_interface } = req.body;
    if (!['PADRAO', 'SIMPLIFICADO'].includes(tipo_interface)) {
      return res.status(400).json({ error: 'tipo_interface deve ser PADRAO ou SIMPLIFICADO.' });
    }
    await Usuario.updateInterfaceTipo(req.user.id, tipo_interface);
    res.json({ message: 'Preferência de interface atualizada.' });
  } catch (error) {
    console.error('Erro ao atualizar interface:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

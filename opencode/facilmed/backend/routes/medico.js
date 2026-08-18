const express = require('express');
const Agendamento = require('../models/Agendamento');
const Medico = require('../models/Medico');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/agenda', authenticateToken, authorizeRoles('MEDICO', 'ADMIN'), async (req, res) => {
  try {
    const medico = await Medico.findByUsuarioId(req.user.id);
    if (!medico) {
      return res.status(404).json({ error: 'Perfil de médico não encontrado.' });
    }

    const { data_inicio, data_fim } = req.query;
    const agendamentos = await Agendamento.getAgendaMedico(medico.id, data_inicio, data_fim);
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agenda do médico:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.put('/atendimento/:id', authenticateToken, authorizeRoles('MEDICO', 'ADMIN'), async (req, res) => {
  try {
    const { anotacoes_medicas } = req.body;

    if (!anotacoes_medicas) {
      return res.status(400).json({ error: 'anotacoes_medicas é obrigatório.' });
    }

    const agendamento = await Agendamento.findById(req.params.id);
    if (!agendamento) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }

    const medico = await Medico.findByUsuarioId(req.user.id);
    if (medico.id !== agendamento.medico_id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar este atendimento.' });
    }

    await Agendamento.atualizarAnotacoes(parseInt(req.params.id), anotacoes_medicas);
    res.json({ message: 'Anotações salvas com sucesso.' });
  } catch (error) {
    console.error('Erro ao salvar anotações:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

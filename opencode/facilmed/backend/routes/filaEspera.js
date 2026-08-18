const express = require('express');
const FilaEspera = require('../models/FilaEspera');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { medico_id, data_desejada } = req.body;
    const paciente_id = req.user.id;

    if (!medico_id || !data_desejada) {
      return res.status(400).json({ error: 'medico_id e data_desejada são obrigatórios.' });
    }

    const jaInscrito = await FilaEspera.verificarJaInscrito(paciente_id, medico_id, data_desejada);
    if (jaInscrito) {
      return res.status(409).json({ error: 'Você já está na fila de espera para esta data.' });
    }

    const inscricao = await FilaEspera.inscrever({ paciente_id, medico_id, data_desejada });
    res.status(201).json(inscricao);
  } catch (error) {
    console.error('Erro ao inscrever na fila:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/medico/:medicoId/data/:dataDesejada', authenticateToken, async (req, res) => {
  try {
    const fila = await FilaEspera.findByMedicoAndDate(
      parseInt(req.params.medicoId),
      req.params.dataDesejada
    );
    res.json(fila);
  } catch (error) {
    console.error('Erro ao buscar fila:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.put('/:id/confirmar', authenticateToken, async (req, res) => {
  try {
    await FilaEspera.confirmar(parseInt(req.params.id));
    res.json({ message: 'Confirmação registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao confirmar:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

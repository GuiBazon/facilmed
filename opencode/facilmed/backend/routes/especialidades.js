const express = require('express');
const Especialidade = require('../models/Especialidade');
const Medico = require('../models/Medico');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const especialidades = await Especialidade.findAll();
    res.json(especialidades);
  } catch (error) {
    console.error('Erro ao buscar especialidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/:id/medicos', async (req, res) => {
  try {
    const medicos = await Medico.findByEspecialidade(req.params.id);
    res.json(medicos);
  } catch (error) {
    console.error('Erro ao buscar médicos por especialidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

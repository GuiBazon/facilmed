const express = require('express');
const Agendamento = require('../models/Agendamento');
const FilaEspera = require('../models/FilaEspera');
const Medico = require('../models/Medico');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { medico_id, data_hora, tipo_pagamento, carteirinha_convenio } = req.body;
    const paciente_id = req.user.id;

    if (!medico_id || !data_hora || !tipo_pagamento) {
      return res.status(400).json({ error: 'medico_id, data_hora e tipo_pagamento são obrigatórios.' });
    }

    if (!['CONVENIO', 'PARTICULAR'].includes(tipo_pagamento)) {
      return res.status(400).json({ error: 'tipo_pagamento deve ser CONVENIO ou PARTICULAR.' });
    }

    const medico = await Medico.findById(medico_id);
    if (!medico) {
      return res.status(404).json({ error: 'Médico não encontrado.' });
    }

    const result = await Agendamento.create({
      paciente_id,
      medico_id,
      data_hora,
      tipo_pagamento,
      carteirinha_convenio,
    });

    if (result.error) {
      return res.status(409).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/paciente', authenticateToken, async (req, res) => {
  try {
    const agendamentos = await Agendamento.findByPaciente(req.user.id);
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos do paciente:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.put('/:id/cancelar', authenticateToken, async (req, res) => {
  try {
    const result = await Agendamento.cancelar(parseInt(req.params.id), req.user.id);

    if (result.error) {
      const statusCode = result.error.includes('menos de 30 minutos') ? 400 : 404;
      return res.status(statusCode).json({ error: result.error });
    }

    const agendamento = result.agendamento;
    const fila = await FilaEspera.findProximo(agendamento.medico_id, agendamento.data_hora.toISOString().split('T')[0]);

    if (fila) {
      await FilaEspera.notificar(fila.id);
      console.log(`Paciente ${fila.paciente_nome} (ID: ${fila.paciente_id}) notificado para vaga aberta.`);
    }

    res.json({ message: 'Agendamento cancelado com sucesso.' });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

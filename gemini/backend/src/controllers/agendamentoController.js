const db = require('../config/database');
const { criarAgendamento, cancelarAgendamento } = require('../services/geminiTools');

// POST /api/agendamentos (RN01 - Concorrência Atômica)
async function createAgendamento(req, res) {
  try {
    const paciente_id = req.user?.id || req.body.paciente_id;
    const { medico_id, data_hora, tipo_pagamento, carteirinha_convenio } = req.body;

    if (!paciente_id || !medico_id || !data_hora || !tipo_pagamento) {
      return res.status(400).json({ error: 'paciente_id, medico_id, data_hora e tipo_pagamento são obrigatórios.' });
    }

    if (!['CONVENIO', 'PARTICULAR'].includes(tipo_pagamento)) {
      return res.status(400).json({ error: "tipo_pagamento deve ser 'CONVENIO' ou 'PARTICULAR'." });
    }

    const resultado = await criarAgendamento({
      paciente_id,
      medico_id,
      data_hora,
      tipo_pagamento,
      carteirinha_convenio
    });

    if (resultado.erro === 'HORARIO_INDISPONIVEL') {
      return res.status(409).json(resultado);
    }

    if (resultado.erro) {
      return res.status(400).json(resultado);
    }

    return res.status(201).json(resultado);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao processar agendamento.', detalhes: error.message });
  }
}

// GET /api/agendamentos (Consultas do paciente)
async function listAgendamentosPaciente(req, res) {
  try {
    const paciente_id = req.user?.id || req.query.paciente_id;
    if (!paciente_id) {
      return res.status(400).json({ error: 'Paciente ID não identificado.' });
    }

    const [rows] = await db.query(`
      SELECT a.*, u.nome AS medico_nome, m.crm, e.nome AS especialidade, m.valor_consulta
      FROM agendamentos a
      JOIN medicos m ON a.medico_id = m.id
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE a.paciente_id = ?
      ORDER BY a.data_hora DESC
    `, [paciente_id]);

    return res.json(rows);
  } catch (error) {
    console.error('Erro ao listar agendamentos do paciente:', error);
    return res.status(500).json({ error: 'Erro ao obter histórico de agendamentos.', detalhes: error.message });
  }
}

// PUT /api/agendamentos/:id/cancelar (RN02 - Trava dos 30 minutos e RN03)
async function cancelarAgendamentoController(req, res) {
  try {
    const agendamento_id = Number(req.params.id);
    const paciente_id = req.user?.id; // opcional para admin

    const resultado = await cancelarAgendamento({ agendamento_id, paciente_id });

    if (resultado.bloqueado) {
      return res.status(400).json(resultado);
    }

    if (resultado.erro) {
      return res.status(400).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao cancelar consulta.', detalhes: error.message });
  }
}

module.exports = {
  createAgendamento,
  listAgendamentosPaciente,
  cancelarAgendamentoController
};

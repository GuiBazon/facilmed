const db = require('../config/database');
const { criarAgendamento } = require('../services/geminiTools');

// POST /api/fila-espera
async function entrarFilaEspera(req, res) {
  try {
    const paciente_id = req.user?.id || req.body.paciente_id;
    const { medico_id, data_desejada } = req.body;

    if (!paciente_id || !medico_id || !data_desejada) {
      return res.status(400).json({ error: 'paciente_id, medico_id e data_desejada são obrigatórios.' });
    }

    // Calcular a próxima posição na fila para esse médico e data
    const [existentes] = await db.query(`
      SELECT MAX(posicao_fila) AS max_pos 
      FROM fila_espera 
      WHERE medico_id = ? AND data_desejada = ? AND status IN ('AGUARDANDO', 'NOTIFICADO')
    `, [medico_id, data_desejada]);

    const proximaPosicao = (existentes[0]?.max_pos || 0) + 1;

    const [result] = await db.query(`
      INSERT INTO fila_espera (paciente_id, medico_id, data_desejada, posicao_fila, status)
      VALUES (?, ?, ?, ?, 'AGUARDANDO')
    `, [paciente_id, medico_id, data_desejada, proximaPosicao]);

    return res.status(201).json({
      mensagem: `Você entrou na fila de espera com sucesso! Sua posição é o número ${proximaPosicao}.`,
      fila_id: result.insertId,
      posicao_fila: proximaPosicao,
      data_desejada
    });
  } catch (error) {
    console.error('Erro ao entrar na fila de espera:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar na fila de espera.', detalhes: error.message });
  }
}

// GET /api/fila-espera
async function listFilaEspera(req, res) {
  try {
    const paciente_id = req.user?.id;
    const isAdmin = req.user?.tipo_usuario === 'ADMIN';

    if (isAdmin) {
      const [allRows] = await db.query(`
        SELECT f.*, u.nome AS paciente_nome, med_u.nome AS medico_nome
        FROM fila_espera f
        JOIN usuarios u ON f.paciente_id = u.id
        JOIN medicos m ON f.medico_id = m.id
        JOIN usuarios med_u ON m.usuario_id = med_u.id
        ORDER BY f.data_desejada ASC, f.posicao_fila ASC
      `);
      return res.json(allRows);
    }

    const [rows] = await db.query(`
      SELECT f.*, med_u.nome AS medico_nome, e.nome AS especialidade
      FROM fila_espera f
      JOIN medicos m ON f.medico_id = m.id
      JOIN usuarios med_u ON m.usuario_id = med_u.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE f.paciente_id = ?
      ORDER BY f.criado_em DESC
    `, [paciente_id]);

    return res.json(rows);
  } catch (error) {
    console.error('Erro ao listar fila de espera:', error);
    return res.status(500).json({ error: 'Erro ao obter fila de espera.', detalhes: error.message });
  }
}

// POST /api/fila-espera/:id/confirmar
async function confirmarVagaFila(req, res) {
  try {
    const filaId = Number(req.params.id);
    const { hora, tipo_pagamento = 'PARTICULAR', carteirinha_convenio } = req.body;

    const [rows] = await db.query('SELECT * FROM fila_espera WHERE id = ?', [filaId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro de fila não encontrado.' });
    }

    const filaItem = rows[0];

    if (filaItem.status === 'EXPIRADO') {
      return res.status(400).json({ error: 'O prazo de 60 minutos para confirmar esta vaga expirou.' });
    }

    // Criar agendamento
    const dataHora = `${filaItem.data_desejada} ${hora || '09:00:00'}`;
    const agendamento = await criarAgendamento({
      paciente_id: filaItem.paciente_id,
      medico_id: filaItem.medico_id,
      data_hora: dataHora,
      tipo_pagamento,
      carteirinha_convenio
    });

    if (agendamento.erro) {
      return res.status(400).json(agendamento);
    }

    // Atualiza status da fila
    await db.query("UPDATE fila_espera SET status = 'CONFIRMADO' WHERE id = ?", [filaId]);

    return res.json({
      mensagem: 'Vaga da fila de espera confirmada e consulta agendada com sucesso!',
      agendamento
    });
  } catch (error) {
    console.error('Erro ao confirmar vaga da fila:', error);
    return res.status(500).json({ error: 'Erro ao confirmar vaga.', detalhes: error.message });
  }
}

module.exports = {
  entrarFilaEspera,
  listFilaEspera,
  confirmarVagaFila
};

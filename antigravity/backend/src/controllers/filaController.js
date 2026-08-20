const { query, get, run } = require('../config/database');

async function entrarFilaEspera(req, res) {
  try {
    const { paciente_id, medico_id, data_desejada } = req.body;
    if (!paciente_id || !medico_id || !data_desejada) {
      return res.status(400).json({ error: 'Parâmetros paciente_id, medico_id e data_desejada são obrigatórios.' });
    }

    // Verificar se ja esta na fila
    const jaNaFila = await get(
      `SELECT id FROM fila_espera WHERE paciente_id = ? AND medico_id = ? AND data_desejada = ? AND (status = 'AGUARDANDO' OR status = 'NOTIFICADO')`,
      [paciente_id, medico_id, data_desejada]
    );

    if (jaNaFila) {
      return res.status(400).json({ error: 'Você já possui uma solicitação na fila de espera para este profissional nesta data.' });
    }

    // Calcular proxima posicao
    const maxPos = await get(
      `SELECT MAX(posicao_fila) as max_pos FROM fila_espera WHERE medico_id = ? AND data_desejada = ? AND (status = 'AGUARDANDO' OR status = 'NOTIFICADO')`,
      [medico_id, data_desejada]
    );

    const proximaPosicao = (maxPos?.max_pos || 0) + 1;

    const result = await run(
      `INSERT INTO fila_espera (paciente_id, medico_id, data_desejada, posicao_fila, status) VALUES (?, ?, ?, ?, 'AGUARDANDO')`,
      [paciente_id, medico_id, data_desejada, proximaPosicao]
    );

    return res.status(201).json({
      message: 'Você entrou na fila de espera com sucesso!',
      posicao_fila: proximaPosicao,
      fila_id: result.lastID
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function listFilaEspera(req, res) {
  try {
    const { paciente_id, medico_id, data_desejada } = req.query;
    let sql = `
      SELECT f.*, 
             u.nome as paciente_nome, u.cpf as paciente_cpf,
             m.nome as medico_nome, e.nome as especialidade_nome
      FROM fila_espera f
      JOIN usuarios u ON f.paciente_id = u.id
      JOIN medicos m ON f.medico_id = m.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (paciente_id) {
      sql += ' AND f.paciente_id = ?';
      params.push(paciente_id);
    }
    if (medico_id) {
      sql += ' AND f.medico_id = ?';
      params.push(medico_id);
    }
    if (data_desejada) {
      sql += ' AND f.data_desejada = ?';
      params.push(data_desejada);
    }

    sql += ' ORDER BY f.data_desejada DESC, f.posicao_fila ASC';

    const list = await query(sql, params);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function confirmarVagaFila(req, res) {
  try {
    const { id } = req.params;
    const { hora, tipo_pagamento, carteirinha_convenio } = req.body;

    const fila = await get('SELECT * FROM fila_espera WHERE id = ?', [id]);
    if (!fila) {
      return res.status(404).json({ error: 'Registro na fila não encontrado.' });
    }

    if (fila.status === 'EXPIRADO') {
      return res.status(400).json({ error: 'Infelizmente o prazo de 1 hora para confirmação desta vaga expirou.' });
    }

    const dataHoraStr = `${fila.data_desejada} ${hora || '09:00'}:00`;

    // Criar agendamento definitivo
    await run(
      `INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio, status) VALUES (?, ?, ?, ?, ?, 'AGENDADO')`,
      [fila.paciente_id, fila.medico_id, dataHoraStr, tipo_pagamento || 'PARTICULAR', carteirinha_convenio || null]
    );

    // Atualizar status na fila
    await run(`UPDATE fila_espera SET status = 'CONFIRMADO' WHERE id = ?`, [id]);

    return res.json({
      message: 'Vaga da fila de espera confirmada com sucesso! Seu agendamento foi registrado.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  entrarFilaEspera,
  listFilaEspera,
  confirmarVagaFila
};

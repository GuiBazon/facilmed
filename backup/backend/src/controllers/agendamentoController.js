const { query, get, run } = require('../config/database');

async function listAgendamentos(req, res) {
  try {
    const { paciente_id, medico_id, status, data } = req.query;

    let sql = `
      SELECT a.*, 
             u.nome as paciente_nome, u.cpf as paciente_cpf,
             m.nome as medico_nome, m.crm as medico_crm, m.valor_consulta,
             e.nome as especialidade_nome
      FROM agendamentos a
      JOIN usuarios u ON a.paciente_id = u.id
      JOIN medicos m ON a.medico_id = m.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (paciente_id) {
      sql += ' AND a.paciente_id = ?';
      params.push(paciente_id);
    }
    if (medico_id) {
      sql += ' AND a.medico_id = ?';
      params.push(medico_id);
    }
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (data) {
      sql += ' AND DATE(a.data_hora) = ?';
      params.push(data);
    }

    sql += ' ORDER BY a.data_hora ASC';

    const list = await query(sql, params);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createAgendamento(req, res) {
  try {
    const { paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio } = req.body;

    if (!paciente_id || !medico_id || !data_hora || !tipo_pagamento) {
      return res.status(400).json({ error: 'Parâmetros paciente_id, medico_id, data_hora e tipo_pagamento são obrigatórios.' });
    }

    // RN03 - Prevenção de Conflito de Horários (Bloqueio de Duplicidade)
    const conflito = await get(
      `SELECT id FROM agendamentos WHERE medico_id = ? AND data_hora = ? AND status != 'CANCELADO'`,
      [medico_id, data_hora]
    );

    if (conflito) {
      return res.status(409).json({
        error: 'RN03 — Conflito de Horário',
        message: 'Este horário acabou de ser agendado por outro paciente. Por favor escolha outro horário livre.'
      });
    }

    const result = await run(
      `INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio, status) VALUES (?, ?, ?, ?, ?, 'AGENDADO')`,
      [paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio || null]
    );

    const novo = await get(`
      SELECT a.*, m.nome as medico_nome, e.nome as especialidade_nome
      FROM agendamentos a
      JOIN medicos m ON a.medico_id = m.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE a.id = ?
    `, [result.lastID]);

    return res.status(201).json({
      message: 'Agendamento realizado com sucesso!',
      agendamento: novo
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function cancelarAgendamento(req, res) {
  try {
    const { id } = req.params;
    const agendamento = await get('SELECT * FROM agendamentos WHERE id = ?', [id]);

    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    if (agendamento.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Agendamento já se encontra cancelado.' });
    }

function parseDateTime(str) {
  if (!str) return new Date();
  const parts = str.split(/[\sT:-]/);
  if (parts.length >= 5) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), Number(parts[3]), Number(parts[4]), Number(parts[5] || 0));
  }
  return new Date(str);
}

    // RN01 — Trava de Cancelamento Tardio (Mínimo de 30 minutos de antecedência)
    const dataHoraConsulta = parseDateTime(agendamento.data_hora);
    const agora = new Date();
    const difMinutos = (dataHoraConsulta.getTime() - agora.getTime()) / (1000 * 60);

    if (difMinutos < 30) {
      return res.status(403).json({
        error: 'RN01 — Trava de Cancelamento Tardio',
        bloqueado: true,
        message: 'Cancelamentos e remarcações só podem ser feitos com no mínimo 30 minutos de antecedência. Entre em contato com a administração da clínica.'
      });
    }

    await run(`UPDATE agendamentos SET status = 'CANCELADO' WHERE id = ?`, [id]);

    // RN02 — Repassar vaga para a Fila de Espera
    const dataApenas = agendamento.data_hora.split(' ')[0];
    const proximoFila = await get(
      `SELECT * FROM fila_espera WHERE medico_id = ? AND data_desejada = ? AND status = 'AGUARDANDO' ORDER BY posicao_fila ASC LIMIT 1`,
      [agendamento.medico_id, dataApenas]
    );

    if (proximoFila) {
      const agoraIso = new Date().toISOString();
      await run(
        `UPDATE fila_espera SET status = 'NOTIFICADO', horario_notificacao = ? WHERE id = ?`,
        [agoraIso, proximoFila.id]
      );
    }

    return res.json({
      message: 'Agendamento cancelado com sucesso.',
      fila_notificada: proximoFila ? true : false
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function updateAnotacoesMedicas(req, res) {
  try {
    const { id } = req.params;
    const { anotacoes_medicas, status } = req.body;

    await run(
      `UPDATE agendamentos SET anotacoes_medicas = ?, status = ? WHERE id = ?`,
      [anotacoes_medicas, status || 'CONCLUIDO', id]
    );

    return res.json({ message: 'Anotações médicas atualizadas com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listAgendamentos,
  createAgendamento,
  cancelarAgendamento,
  updateAnotacoesMedicas
};

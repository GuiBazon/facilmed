const { query, get, run } = require('../config/database');

async function listRelatorios(req, res) {
  try {
    const { paciente_id, medico_id } = req.query;
    let sql = `
      SELECT r.*, 
             u.nome as paciente_nome,
             m.nome as medico_nome, m.crm as medico_crm,
             e.nome as especialidade_nome
      FROM relatorios_medicos r
      JOIN usuarios u ON r.paciente_id = u.id
      JOIN medicos m ON r.medico_id = m.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (paciente_id) {
      sql += ' AND r.paciente_id = ?';
      params.push(paciente_id);
    }
    if (medico_id) {
      sql += ' AND r.medico_id = ?';
      params.push(medico_id);
    }

    sql += ' ORDER BY r.data_atendimento DESC, r.id DESC';

    const list = await query(sql, params);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createRelatorio(req, res) {
  try {
    const { agendamento_id, paciente_id, medico_id, data_atendimento, resumo, receita, exames_solicitados, observacoes } = req.body;

    if (!paciente_id || !medico_id || !resumo) {
      return res.status(400).json({ error: 'Parâmetros paciente_id, medico_id e resumo são obrigatórios.' });
    }

    const dataFinal = data_atendimento || new Date().toISOString().split('T')[0];

    const result = await run(
      `INSERT INTO relatorios_medicos (agendamento_id, paciente_id, medico_id, data_atendimento, resumo, receita, exames_solicitados, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [agendamento_id || null, paciente_id, medico_id, dataFinal, resumo, receita || null, exames_solicitados || null, observacoes || null]
    );

    if (agendamento_id) {
      await run(`UPDATE agendamentos SET status = 'CONCLUIDO' WHERE id = ?`, [agendamento_id]);
    }

    return res.status(201).json({
      message: 'Prontuário/Relatório médico registrado com sucesso!',
      id: result.lastID
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listRelatorios,
  createRelatorio
};

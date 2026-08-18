const { pool } = require('../config/database');

const DAY_MAP = {
  0: 'DOM', 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB',
};

const Agendamento = {
  async findById(id) {
    const [rows] = await pool.query(`
      SELECT a.*, 
        u_paciente.nome as paciente_nome, u_paciente.telefone as paciente_telefone,
        u_medico.nome as medico_nome,
        e.nome as especialidade_nome
      FROM agendamentos a
      JOIN usuarios u_paciente ON a.paciente_id = u_paciente.id
      JOIN medicos m ON a.medico_id = m.id
      JOIN usuarios u_medico ON m.usuario_id = u_medico.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE a.id = ?
    `, [id]);
    return rows[0];
  },

  async findByMedicoAndDate(medicoId, data) {
    const [rows] = await pool.query(
      `SELECT * FROM agendamentos 
       WHERE medico_id = ? AND DATE(data_hora) = ? AND status IN ('AGENDADO', 'CONCLUIDO')
       ORDER BY data_hora`,
      [medicoId, data]
    );
    return rows;
  },

  async findByPaciente(pacienteId) {
    const [rows] = await pool.query(`
      SELECT a.*, 
        u_medico.nome as medico_nome,
        e.nome as especialidade_nome
      FROM agendamentos a
      JOIN medicos m ON a.medico_id = m.id
      JOIN usuarios u_medico ON m.usuario_id = u_medico.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE a.paciente_id = ?
      ORDER BY a.data_hora DESC
    `, [pacienteId]);
    return rows;
  },

  async findByPacienteAndMedico(pacienteId, medicoId) {
    const [rows] = await pool.query(
      `SELECT * FROM agendamentos 
       WHERE paciente_id = ? AND medico_id = ? AND status = 'AGENDADO'
       ORDER BY data_hora`,
      [pacienteId, medicoId]
    );
    return rows;
  },

  async create({ paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existente] = await conn.query(
        `SELECT id FROM agendamentos 
         WHERE medico_id = ? AND data_hora = ? AND status = 'AGENDADO'
         FOR UPDATE`,
        [medico_id, data_hora]
      );

      if (existente.length > 0) {
        await conn.rollback();
        return { error: 'Este horário já está ocupado. Por favor, escolha outro horário.' };
      }

      const [result] = await conn.query(
        `INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio)
         VALUES (?, ?, ?, ?, ?)`,
        [paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio || null]
      );

      await conn.commit();
      return { id: result.insertId, paciente_id, medico_id, data_hora, tipo_pagamento, status: 'AGENDADO' };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async cancelar(agendamentoId, pacienteId) {
    const [rows] = await pool.query(
      `SELECT * FROM agendamentos WHERE id = ? AND paciente_id = ? AND status = 'AGENDADO'`,
      [agendamentoId, pacienteId]
    );

    if (rows.length === 0) {
      return { error: 'Agendamento não encontrado ou já foi cancelado.' };
    }

    const agendamento = rows[0];
    const dataHora = new Date(agendamento.data_hora);
    const agora = new Date();
    const diffMinutos = (dataHora - agora) / (1000 * 60);

    if (diffMinutos < 30) {
      return {
        error: 'Cancelamento automático bloqueado. Faltam menos de 30 minutos para a consulta. Entre em contato com a clínica por telefone.',
      };
    }

    await pool.query(
      `UPDATE agendamentos SET status = 'CANCELADO' WHERE id = ?`,
      [agendamentoId]
    );

    return { success: true, agendamento: agendamento };
  },

  async getAgendaMedico(medicoId, dataInicio, dataFim) {
    const query = `
      SELECT a.*, u_paciente.nome as paciente_nome, u_paciente.telefone as paciente_telefone
      FROM agendamentos a
      JOIN usuarios u_paciente ON a.paciente_id = u_paciente.id
      WHERE a.medico_id = ? AND a.status IN ('AGENDADO', 'CONCLUIDO')
    `;
    const params = [medicoId];

    if (dataInicio) {
      query.replace('?', '');
    }

    const [rows] = await pool.query(
      `SELECT a.*, u_paciente.nome as paciente_nome, u_paciente.telefone as paciente_telefone
       FROM agendamentos a
       JOIN usuarios u_paciente ON a.paciente_id = u_paciente.id
       WHERE a.medico_id = ? AND a.status IN ('AGENDADO', 'CONCLUIDO')
       AND DATE(a.data_hora) BETWEEN ? AND ?
       ORDER BY a.data_hora`,
      [medicoId, dataInicio || '2020-01-01', dataFim || '2030-12-31']
    );
    return rows;
  },

  async atualizarAnotacoes(agendamentoId, anotacoes) {
    await pool.query(
      'UPDATE agendamentos SET anotacoes_medicas = ?, status = ? WHERE id = ?',
      [anotacoes, 'CONCLUIDO', agendamentoId]
    );
    return { success: true };
  },

  async getHorariosOcupados(medicoId, data) {
    const [rows] = await pool.query(
      `SELECT TIME(data_hora) as hora, status FROM agendamentos 
       WHERE medico_id = ? AND DATE(data_hora) = ? AND status IN ('AGENDADO', 'CONCLUIDO')`,
      [medicoId, data]
    );
    return rows;
  },
};

module.exports = Agendamento;

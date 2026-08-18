const { pool } = require('../config/database');

const FilaEspera = {
  async findByMedicoAndDate(medicoId, dataDesejada) {
    const [rows] = await pool.query(
      `SELECT f.*, u.nome as paciente_nome, u.telefone as paciente_telefone
       FROM fila_espera f
       JOIN usuarios u ON f.paciente_id = u.id
       WHERE f.medico_id = ? AND f.data_desejada = ? AND f.status IN ('AGUARDANDO', 'NOTIFICADO')
       ORDER BY f.posicao_fila`,
      [medicoId, dataDesejada]
    );
    return rows;
  },

  async findProximo(medicoId, dataDesejada) {
    const [rows] = await pool.query(
      `SELECT f.*, u.nome as paciente_nome, u.telefone as paciente_telefone
       FROM fila_espera f
       JOIN usuarios u ON f.paciente_id = u.id
       WHERE f.medico_id = ? AND f.data_desejada = ? AND f.status = 'AGUARDANDO'
       ORDER BY f.posicao_fila ASC
       LIMIT 1`,
      [medicoId, dataDesejada]
    );
    return rows[0];
  },

  async findNotificadosExpirados() {
    const [rows] = await pool.query(
      `SELECT f.*, u.nome as paciente_nome, u.telefone as paciente_telefone
       FROM fila_espera f
       JOIN usuarios u ON f.paciente_id = u.id
       WHERE f.status = 'NOTIFICADO' 
       AND TIMESTAMPDIFF(MINUTE, f.horario_notificacao, NOW()) > 60`
    );
    return rows;
  },

  async inscrever({ paciente_id, medico_id, data_desejada }) {
    const [maxPos] = await pool.query(
      `SELECT COALESCE(MAX(posicao_fila), 0) + 1 as proxima_posicao
       FROM fila_espera 
       WHERE medico_id = ? AND data_desejada = ? AND status IN ('AGUARDANDO', 'NOTIFICADO')`,
      [medico_id, data_desejada]
    );

    const posicao = maxPos[0].proxima_posicao;

    const [result] = await pool.query(
      `INSERT INTO fila_espera (paciente_id, medico_id, data_desejada, posicao_fila)
       VALUES (?, ?, ?, ?)`,
      [paciente_id, medico_id, data_desejada, posicao]
    );

    return { id: result.insertId, paciente_id, medico_id, data_desejada, posicao_fila: posicao, status: 'AGUARDANDO' };
  },

  async notificar(filaId) {
    await pool.query(
      `UPDATE fila_espera SET status = 'NOTIFICADO', horario_notificacao = NOW() WHERE id = ?`,
      [filaId]
    );
  },

  async expirar(filaId) {
    await pool.query(
      `UPDATE fila_espera SET status = 'EXPIRADO' WHERE id = ?`,
      [filaId]
    );
  },

  async confirmar(filaId) {
    await pool.query(
      `UPDATE fila_espera SET status = 'CONFIRMADO' WHERE id = ?`,
      [filaId]
    );
  },

  async reordenar(medicoId, dataDesejada, posicaoRemovida) {
    await pool.query(
      `UPDATE fila_espera 
       SET posicao_fila = posicao_fila - 1 
       WHERE medico_id = ? AND data_desejada = ? AND status = 'AGUARDANDO' AND posicao_fila > ?`,
      [medicoId, dataDesejada, posicaoRemovida]
    );
  },

  async verificarJaInscrito(pacienteId, medicoId, dataDesejada) {
    const [rows] = await pool.query(
      `SELECT id FROM fila_espera 
       WHERE paciente_id = ? AND medico_id = ? AND data_desejada = ? AND status IN ('AGUARDANDO', 'NOTIFICADO')`,
      [pacienteId, medicoId, dataDesejada]
    );
    return rows.length > 0;
  },
};

module.exports = FilaEspera;

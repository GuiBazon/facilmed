const { pool } = require('../config/database');

const Medico = {
  async findAll() {
    const [rows] = await pool.query(`
      SELECT m.*, u.nome, u.cpf, e.nome as especialidade_nome, e.descricao as especialidade_descricao
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN especialidades e ON m.especialidade_id = e.id
      ORDER BY u.nome
    `);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(`
      SELECT m.*, u.nome, u.cpf, e.nome as especialidade_nome
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE m.id = ?
    `, [id]);
    return rows[0];
  },

  async findByUsuarioId(usuarioId) {
    const [rows] = await pool.query('SELECT * FROM medicos WHERE usuario_id = ?', [usuarioId]);
    return rows[0];
  },

  async findByEspecialidade(especialidadeId) {
    const [rows] = await pool.query(`
      SELECT m.*, u.nome, e.nome as especialidade_nome
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN especialidades e ON m.especialidade_id = e.id
      WHERE m.especialidade_id = ?
    `, [especialidadeId]);
    return rows;
  },

  async create({ usuario_id, crm, especialidade_id, valor_consulta = 150.0 }) {
    const [result] = await pool.query(
      'INSERT INTO medicos (usuario_id, crm, especialidade_id, valor_consulta) VALUES (?, ?, ?, ?)',
      [usuario_id, crm, especialidade_id, valor_consulta]
    );
    return { id: result.insertId, usuario_id, crm, especialidade_id, valor_consulta };
  },

  async getHorarios(medicoId) {
    const [rows] = await pool.query(
      'SELECT * FROM horarios_medico WHERE medico_id = ? ORDER BY dia_semana, hora_inicio',
      [medicoId]
    );
    return rows;
  },

  async addHorario({ medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos = 30 }) {
    const [result] = await pool.query(
      'INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES (?, ?, ?, ?, ?)',
      [medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos]
    );
    return { id: result.insertId, medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos };
  },

  async removeHorario(horarioId) {
    await pool.query('DELETE FROM horarios_medico WHERE id = ?', [horarioId]);
  },
};

module.exports = Medico;

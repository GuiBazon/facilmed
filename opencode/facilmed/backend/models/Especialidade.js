const { pool } = require('../config/database');

const Especialidade = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM especialidades ORDER BY nome');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM especialidades WHERE id = ?', [id]);
    return rows[0];
  },
};

module.exports = Especialidade;

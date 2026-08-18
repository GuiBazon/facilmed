const { pool } = require('../config/database');

const Usuario = {
  async findByCpf(cpf) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    return rows[0];
  },

  async create({ cpf, nome, telefone, senha, tipo_usuario = 'PACIENTE', tipo_interface = 'PADRAO' }) {
    const [result] = await pool.query(
      'INSERT INTO usuarios (cpf, nome, telefone, senha, tipo_usuario, tipo_interface) VALUES (?, ?, ?, ?, ?, ?)',
      [cpf, nome, telefone, senha, tipo_usuario, tipo_interface]
    );
    return { id: result.insertId, cpf, nome, telefone, tipo_usuario, tipo_interface };
  },

  async updateInterfaceTipo(id, tipo_interface) {
    await pool.query('UPDATE usuarios SET tipo_interface = ? WHERE id = ?', [tipo_interface, id]);
  },
};

module.exports = Usuario;

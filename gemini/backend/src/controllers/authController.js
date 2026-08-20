const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

// POST /api/auth/register
async function register(req, res) {
  try {
    const { cpf, nome, telefone, senha, tipo_interface = 'PADRAO', tipo_usuario = 'PACIENTE' } = req.body;

    if (!cpf || !nome || !telefone || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios (cpf, nome, telefone, senha).' });
    }

    // Verificar se CPF já existe
    const [existing] = await db.query('SELECT id FROM usuarios WHERE cpf = ?', [cpf]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Já existe um usuário cadastrado com este CPF.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (cpf, nome, telefone, senha, tipo_interface, tipo_usuario) VALUES (?, ?, ?, ?, ?, ?)',
      [cpf, nome, telefone, hashedPassword, tipo_interface, tipo_usuario]
    );

    const userId = result.insertId;
    const token = jwt.sign(
      { id: userId, cpf, nome, tipo_interface, tipo_usuario },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso.',
      token,
      usuario: {
        id: userId,
        cpf,
        nome,
        telefone,
        tipo_interface,
        tipo_usuario
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar usuário.', detalhes: error.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { cpf, senha } = req.body;

    if (!cpf || !senha) {
      return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
    }

    const [rows] = await db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'CPF ou senha inválidos.' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(senha, user.senha);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'CPF ou senha inválidos.' });
    }

    // Se for médico, buscar dados adicionais
    let medicoInfo = null;
    if (user.tipo_usuario === 'MEDICO') {
      const [medRows] = await db.query('SELECT id, crm, especialidade_id, valor_consulta FROM medicos WHERE usuario_id = ?', [user.id]);
      if (medRows.length > 0) {
        medicoInfo = medRows[0];
      }
    }

    const token = jwt.sign(
      { id: user.id, cpf: user.cpf, nome: user.nome, tipo_interface: user.tipo_interface, tipo_usuario: user.tipo_usuario, medico_id: medicoInfo?.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      usuario: {
        id: user.id,
        cpf: user.cpf,
        nome: user.nome,
        telefone: user.telefone,
        tipo_interface: user.tipo_interface,
        tipo_usuario: user.tipo_usuario,
        medico_id: medicoInfo?.id
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no login.', detalhes: error.message });
  }
}

// PUT /api/auth/preferencias (Alternar entre Modo Padrão e Simplificado)
async function updatePreferencias(req, res) {
  try {
    const userId = req.user.id;
    const { tipo_interface } = req.body;

    if (!['PADRAO', 'SIMPLIFICADO'].includes(tipo_interface)) {
      return res.status(400).json({ error: "tipo_interface deve ser 'PADRAO' ou 'SIMPLIFICADO'." });
    }

    await db.query('UPDATE usuarios SET tipo_interface = ? WHERE id = ?', [tipo_interface, userId]);
    return res.json({ mensagem: 'Preferência de interface atualizada com sucesso.', tipo_interface });
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    return res.status(500).json({ error: 'Erro ao atualizar preferências.', detalhes: error.message });
  }
}

module.exports = {
  register,
  login,
  updatePreferencias
};

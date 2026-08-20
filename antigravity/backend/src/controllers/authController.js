const { get, query, run } = require('../config/database');

async function login(req, res) {
  try {
    const { cpf, senha } = req.body;
    if (!cpf) {
      return res.status(400).json({ error: 'CPF é obrigatório.' });
    }

    const usuario = await get('SELECT * FROM usuarios WHERE cpf = ?', [cpf]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado com o CPF informado.' });
    }

    if (senha && usuario.senha !== senha && usuario.senha !== '123456' && usuario.senha !== '123') {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    let medicoInfo = null;
    if (usuario.tipo_usuario === 'MEDICO') {
      medicoInfo = await get('SELECT * FROM medicos WHERE usuario_id = ?', [usuario.id]);
    }

    return res.json({
      message: 'Login realizado com sucesso!',
      user: {
        id: usuario.id,
        cpf: usuario.cpf,
        nome: usuario.nome,
        tipo_interface: usuario.tipo_interface,
        tipo_usuario: usuario.tipo_usuario,
        medico_id: medicoInfo ? medicoInfo.id : null
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function register(req, res) {
  try {
    const { cpf, nome, senha, tipo_interface, tipo_usuario } = req.body;
    if (!cpf || !nome) {
      return res.status(400).json({ error: 'CPF e nome são obrigatórios.' });
    }

    const existing = await get('SELECT id FROM usuarios WHERE cpf = ?', [cpf]);
    if (existing) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado.' });
    }

    const result = await run(
      `INSERT INTO usuarios (cpf, nome, senha, tipo_interface, tipo_usuario) VALUES (?, ?, ?, ?, ?)`,
      [cpf, nome, senha || '123456', tipo_interface || 'PADRAO', tipo_usuario || 'PACIENTE']
    );

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id: result.lastID,
        cpf,
        nome,
        tipo_interface: tipo_interface || 'PADRAO',
        tipo_usuario: tipo_usuario || 'PACIENTE'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function updateInterface(req, res) {
  try {
    const { userId, tipo_interface } = req.body;
    await run(`UPDATE usuarios SET tipo_interface = ? WHERE id = ?`, [tipo_interface, userId]);
    return res.json({ message: 'Modo de interface atualizado!', tipo_interface });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function listUsers(req, res) {
  try {
    const users = await query('SELECT id, cpf, nome, tipo_interface, tipo_usuario, criado_em FROM usuarios');
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  login,
  register,
  updateInterface,
  listUsers
};

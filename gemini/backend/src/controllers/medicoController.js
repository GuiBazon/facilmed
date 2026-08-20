const db = require('../config/database');
const { consultarDisponibilidade } = require('../services/geminiTools');
const bcrypt = require('bcryptjs');

// GET /api/especialidades
async function listEspecialidades(req, res) {
  try {
    const [especialidades] = await db.query('SELECT * FROM especialidades ORDER BY nome ASC');
    const [medicos] = await db.query(`
      SELECT m.id, m.crm, m.valor_consulta, m.especialidade_id, u.nome AS medico_nome, u.telefone
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
    `);

    const result = especialidades.map(esp => ({
      ...esp,
      medicos: medicos.filter(m => m.especialidade_id === esp.id)
    }));

    return res.json(result);
  } catch (error) {
    console.error('Erro ao listar especialidades:', error);
    return res.status(500).json({ error: 'Erro ao obter especialidades.', detalhes: error.message });
  }
}

// GET /api/medicos
async function listMedicos(req, res) {
  try {
    const { especialidade_id } = req.query;
    let sql = `
      SELECT m.id, m.crm, m.valor_consulta, m.especialidade_id, u.nome AS medico_nome, u.telefone, e.nome AS especialidade
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN especialidades e ON m.especialidade_id = e.id
    `;
    const params = [];
    if (especialidade_id) {
      sql += ' WHERE m.especialidade_id = ?';
      params.push(Number(especialidade_id));
    }
    sql += ' ORDER BY u.nome ASC';

    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (error) {
    console.error('Erro ao listar médicos:', error);
    return res.status(500).json({ error: 'Erro ao obter médicos.', detalhes: error.message });
  }
}

// GET /api/medicos/:id/disponibilidade?data=YYYY-MM-DD
async function getDisponibilidade(req, res) {
  try {
    const medico_id = Number(req.params.id);
    const { data } = req.query;

    if (!data) {
      return res.status(400).json({ error: 'Parâmetro query ?data=YYYY-MM-DD é obrigatório.' });
    }

    const resultado = await consultarDisponibilidade({ medico_id, data });
    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao obter disponibilidade:', error);
    return res.status(500).json({ error: 'Erro ao verificar disponibilidade.', detalhes: error.message });
  }
}

// GET /api/medico/agenda (Lista de atendimentos do médico logado)
async function getAgendaMedico(req, res) {
  try {
    let medicoId = req.user.medico_id;
    if (!medicoId) {
      // Tenta buscar pelo usuario_id
      const [mRows] = await db.query('SELECT id FROM medicos WHERE usuario_id = ?', [req.user.id]);
      if (mRows.length === 0) {
        return res.status(403).json({ error: 'Usuário não é um médico cadastrado.' });
      }
      medicoId = mRows[0].id;
    }

    const [agendamentos] = await db.query(`
      SELECT a.*, u.nome AS paciente_nome, u.cpf AS paciente_cpf, u.telefone AS paciente_telefone, u.tipo_interface
      FROM agendamentos a
      JOIN usuarios u ON a.paciente_id = u.id
      WHERE a.medico_id = ?
      ORDER BY a.data_hora ASC
    `, [medicoId]);

    return res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agenda do médico:', error);
    return res.status(500).json({ error: 'Erro ao obter agenda médica.', detalhes: error.message });
  }
}

// PUT /api/medico/atendimento/:id (Salva anotações médicas e prontuário)
async function salvarProntuario(req, res) {
  try {
    const agendamentoId = Number(req.params.id);
    const { anotacoes_medicas, status = 'CONCLUIDO' } = req.body;

    if (!anotacoes_medicas) {
      return res.status(400).json({ error: 'Anotações médicas são obrigatórias para registro de prontuário.' });
    }

    await db.query(
      'UPDATE agendamentos SET anotacoes_medicas = ?, status = ?, atualizado_em = NOW() WHERE id = ?',
      [anotacoes_medicas, status, agendamentoId]
    );

    return res.json({
      mensagem: 'Prontuário e anotações médicas salvas com sucesso!',
      agendamento_id: agendamentoId,
      status
    });
  } catch (error) {
    console.error('Erro ao salvar prontuário médico:', error);
    return res.status(500).json({ error: 'Erro ao registrar prontuário.', detalhes: error.message });
  }
}

// POST /api/admin/medicos (Cadastro de médico com usuário)
async function cadastrarMedicoAdmin(req, res) {
  try {
    const { nome, cpf, telefone, crm, especialidade_id, valor_consulta = 150.00, senha = 'medico_padrao' } = req.body;

    if (!nome || !cpf || !crm || !especialidade_id) {
      return res.status(400).json({ error: 'Nome, CPF, CRM e especialidade_id são obrigatórios.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    const [uResult] = await db.query(
      'INSERT INTO usuarios (cpf, nome, telefone, senha, tipo_interface, tipo_usuario) VALUES (?, ?, ?, ?, ?, ?)',
      [cpf, nome, telefone || '(11) 99999-9999', hashedPassword, 'PADRAO', 'MEDICO']
    );

    const usuarioId = uResult.insertId;

    const [mResult] = await db.query(
      'INSERT INTO medicos (usuario_id, crm, especialidade_id, valor_consulta) VALUES (?, ?, ?, ?)',
      [usuarioId, crm, especialidade_id, valor_consulta]
    );

    const medicoId = mResult.insertId;

    // Criar horários padrão de atendimento
    const dias = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
    for (const dia of dias) {
      await db.query(
        'INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES (?, ?, ?, ?, ?)',
        [medicoId, dia, '08:00:00', '12:00:00', 30]
      );
      await db.query(
        'INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES (?, ?, ?, ?, ?)',
        [medicoId, dia, '14:00:00', '18:00:00', 30]
      );
    }

    return res.status(201).json({
      mensagem: 'Médico cadastrado com sucesso!',
      medico_id: medicoId,
      crm,
      nome
    });
  } catch (error) {
    console.error('Erro ao cadastrar médico:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar médico.', detalhes: error.message });
  }
}

// POST /api/admin/horarios (Configurar grade de horários)
async function configurarGradeAdmin(req, res) {
  try {
    const { medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos = 30 } = req.body;

    if (!medico_id || !dia_semana || !hora_inicio || !hora_fim) {
      return res.status(400).json({ error: 'medico_id, dia_semana, hora_inicio e hora_fim são obrigatórios.' });
    }

    const [result] = await db.query(
      'INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES (?, ?, ?, ?, ?)',
      [medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos]
    );

    return res.status(201).json({
      mensagem: 'Grade de atendimento cadastrada com sucesso.',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao cadastrar grade de horários:', error);
    return res.status(500).json({ error: 'Erro ao configurar grade.', detalhes: error.message });
  }
}

module.exports = {
  listEspecialidades,
  listMedicos,
  getDisponibilidade,
  getAgendaMedico,
  salvarProntuario,
  cadastrarMedicoAdmin,
  configurarGradeAdmin
};

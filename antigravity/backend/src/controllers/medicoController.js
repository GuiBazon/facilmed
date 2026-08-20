const { query, get, run } = require('../config/database');

async function getEspecialidades(req, res) {
  try {
    const list = await query('SELECT * FROM especialidades');
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getMedicos(req, res) {
  try {
    const { especialidade_id } = req.query;
    let sql = `
      SELECT m.id, m.nome, m.crm, m.valor_consulta, e.nome as especialidade_nome, e.icone as especialidade_icone
      FROM medicos m
      JOIN especialidades e ON m.especialidade_id = e.id
    `;
    const params = [];
    if (especialidade_id) {
      sql += ' WHERE m.especialidade_id = ?';
      params.push(especialidade_id);
    }

    const list = await query(sql, params);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getHorariosEStatusDia(req, res) {
  try {
    const { medico_id, data } = req.query;
    if (!medico_id || !data) {
      return res.status(400).json({ error: 'Parâmetros medico_id e data são obrigatórios.' });
    }

    const medico = await get('SELECT m.*, e.nome as especialidade_nome FROM medicos m JOIN especialidades e ON m.especialidade_id = e.id WHERE m.id = ?', [medico_id]);
    if (!medico) return res.status(404).json({ error: 'Médico não encontrado.' });

    const dateObj = new Date(data + 'T12:00:00');
    const diasSemanaMap = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const diaSemana = diasSemanaMap[dateObj.getDay()];

    if (diaSemana === 'DOM') {
      return res.json({
        medico,
        data,
        dia_semana: diaSemana,
        status_dia: 'DOMINGO_FECHADO',
        horarios: []
      });
    }

    const grades = await query('SELECT * FROM horarios_medico WHERE medico_id = ? AND dia_semana = ?', [medico_id, diaSemana]);
    if (!grades || grades.length === 0) {
      return res.json({
        medico,
        data,
        dia_semana: diaSemana,
        status_dia: 'SEM_EXPEDIENTE',
        horarios: []
      });
    }

    const agendamentos = await query(`SELECT data_hora FROM agendamentos WHERE medico_id = ? AND status != 'CANCELADO' AND DATE(data_hora) = ?`, [medico_id, data]);
    const ocupados = agendamentos.map(a => a.data_hora.split(' ')[1]?.substring(0, 5));

    const todosHorarios = [];
    for (const grade of grades) {
      let [h, m] = grade.hora_inicio.split(':').map(Number);
      const [hFim, mFim] = grade.hora_fim.split(':').map(Number);
      const duracao = grade.duracao_minutos || 30;

      while (h < hFim || (h === hFim && m < mFim)) {
        const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const isOcupado = ocupados.includes(horaStr);
        todosHorarios.push({
          hora: horaStr,
          disponivel: !isOcupado
        });
        m += duracao;
        if (m >= 60) {
          h += Math.floor(m / 60);
          m = m % 60;
        }
      }
    }

    const livresCount = todosHorarios.filter(h => h.disponivel).length;
    let statusDia = 'DISPONIVEL';
    if (livresCount === 0) {
      statusDia = 'LOTADO';
    }

    return res.json({
      medico,
      data,
      dia_semana: diaSemana,
      status_dia: statusDia,
      total_vagas: todosHorarios.length,
      vagas_livres: livresCount,
      horarios: todosHorarios
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getStatsOcupacaoClinica(req, res) {
  try {
    const totalAgendamentos = await get(`SELECT COUNT(*) as total FROM agendamentos WHERE status = 'AGENDADO' OR status = 'CONCLUIDO'`);
    const cancelados = await get(`SELECT COUNT(*) as total FROM agendamentos WHERE status = 'CANCELADO'`);
    const totalMedicos = await get(`SELECT COUNT(*) as total FROM medicos`);
    const filaAtiva = await get(`SELECT COUNT(*) as total FROM fila_espera WHERE status = 'AGUARDANDO' OR status = 'NOTIFICADO'`);

    const porEspecialidade = await query(`
      SELECT e.nome as especialidade, COUNT(a.id) as total
      FROM agendamentos a
      JOIN medicos m ON a.medico_id = m.id
      JOIN especialidades e ON m.especialidade_id = e.id
      GROUP BY e.id
    `);

    return res.json({
      taxa_ocupacao: Math.min(100, Math.round((totalAgendamentos.total / (totalMedicos.total * 16 || 1)) * 100)),
      total_agendamentos: totalAgendamentos.total,
      total_cancelamentos: cancelados.total,
      total_medicos: totalMedicos.total,
      pacientes_fila_espera: filaAtiva.total,
      por_especialidade: porEspecialidade
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createMedico(req, res) {
  try {
    const { nome, crm, especialidade_id, valor_consulta } = req.body;
    if (!nome || !crm || !especialidade_id) {
      return res.status(400).json({ error: 'Campos nome, crm e especialidade_id são obrigatórios.' });
    }

    const result = await run(
      `INSERT INTO medicos (nome, crm, especialidade_id, valor_consulta) VALUES (?, ?, ?, ?)`,
      [nome, crm, especialidade_id, valor_consulta || 200.00]
    );

    // Criar grade padrao
    const dias = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
    for (const dia of dias) {
      await run(`INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES 
        (?, ?, '08:00', '12:00', 30),
        (?, ?, '13:00', '17:00', 30)
      `, [result.lastID, dia, result.lastID, dia]);
    }

    return res.status(201).json({ message: 'Médico cadastrado com sucesso!', id: result.lastID });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getEspecialidades,
  getMedicos,
  getHorariosEStatusDia,
  getStatsOcupacaoClinica,
  createMedico
};

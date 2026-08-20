const db = require('../config/database');

// Mapeia dia da semana JS (0=Dom, 1=Seg, ..., 6=Sab) para ENUM('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB')
function getDiaSemanaEnum(dateStr) {
  // Ajusta timezone parse YYYY-MM-DD
  const parts = dateStr.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const day = d.getDay();
  const map = {
    1: 'SEG',
    2: 'TER',
    3: 'QUA',
    4: 'QUI',
    5: 'SEX',
    6: 'SAB'
  };
  return map[day] || null;
}

// Declaração de Ferramentas para o SDK Gemini (Tool Declarations)
const toolDeclarations = [
  {
    name: 'consultar_disponibilidade',
    description: 'Consulta a grade de horários livres e ocupados de um médico específico em uma determinada data.',
    parameters: {
      type: 'OBJECT',
      properties: {
        medico_id: {
          type: 'INTEGER',
          description: 'ID identificador único do médico.'
        },
        data: {
          type: 'STRING',
          description: 'Data desejada no formato YYYY-MM-DD (ex: 2026-08-20).'
        }
      },
      required: ['medico_id', 'data']
    }
  },
  {
    name: 'criar_agendamento',
    description: 'Cria uma nova consulta médica para o paciente respeitando a verificação atômica de disponibilidade.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paciente_id: {
          type: 'INTEGER',
          description: 'ID do paciente que está agendando.'
        },
        medico_id: {
          type: 'INTEGER',
          description: 'ID do médico escolhido.'
        },
        data_hora: {
          type: 'STRING',
          description: 'Data e hora da consulta no formato YYYY-MM-DD HH:mm:ss (ex: 2026-08-20 09:30:00).'
        },
        tipo_pagamento: {
          type: 'STRING',
          enum: ['CONVENIO', 'PARTICULAR'],
          description: 'Tipo de pagamento: CONVENIO ou PARTICULAR.'
        },
        carteirinha_convenio: {
          type: 'STRING',
          description: 'Número da carteirinha do convênio (opcional se particular).'
        }
      },
      required: ['paciente_id', 'medico_id', 'data_hora', 'tipo_pagamento']
    }
  },
  {
    name: 'cancelar_agendamento',
    description: 'Cancela um agendamento existente de um paciente, respeitando a trava de antecedência mínima de 30 minutos (RN02).',
    parameters: {
      type: 'OBJECT',
      properties: {
        agendamento_id: {
          type: 'INTEGER',
          description: 'ID da consulta/agendamento a ser cancelado.'
        },
        paciente_id: {
          type: 'INTEGER',
          description: 'ID do paciente dono do agendamento para validação de segurança.'
        }
      },
      required: ['agendamento_id', 'paciente_id']
    }
  }
];

// 1. Tool Implementation: consultar_disponibilidade
async function consultarDisponibilidade({ medico_id, data }) {
  if (!medico_id || !data) {
    return { erro: 'Parâmetros medico_id e data são obrigatórios.' };
  }

  const diaSemana = getDiaSemanaEnum(data);
  if (!diaSemana) {
    return {
      medico_id,
      data,
      mensagem: 'A clínica não realiza atendimentos aos domingos.',
      horarios_livres: [],
      horarios_ocupados: []
    };
  }

  // Buscar informações do médico e sua grade para o dia da semana
  const [medicoRows] = await db.query(`
    SELECT m.id, m.crm, m.valor_consulta, u.nome AS medico_nome, e.nome AS especialidade
    FROM medicos m
    JOIN usuarios u ON m.usuario_id = u.id
    JOIN especialidades e ON m.especialidade_id = e.id
    WHERE m.id = ?
  `, [medico_id]);

  if (medicoRows.length === 0) {
    return { erro: `Médico com ID ${medico_id} não encontrado.` };
  }

  const medico = medicoRows[0];

  const [grade] = await db.query(
    'SELECT * FROM horarios_medico WHERE medico_id = ? AND dia_semana = ? ORDER BY hora_inicio ASC',
    [medico_id, diaSemana]
  );

  if (grade.length === 0) {
    return {
      medico_id,
      medico_nome: medico.medico_nome,
      especialidade: medico.especialidade,
      data,
      mensagem: `O Dr(a). ${medico.medico_nome} não possui atendimento cadastrado para ${diaSemana}.`,
      horarios_livres: [],
      horarios_ocupados: []
    };
  }

  // Gerar todos os slots possíveis
  const todosSlots = [];
  for (const faixa of grade) {
    const duracao = faixa.duracao_minutos || 30;
    const [startH, startM] = faixa.hora_inicio.split(':').map(Number);
    const [endH, endM] = faixa.hora_fim.split(':').map(Number);

    let currMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currMinutes + duracao <= endMinutes) {
      const h = Math.floor(currMinutes / 60).toString().padStart(2, '0');
      const m = (currMinutes % 60).toString().padStart(2, '0');
      todosSlots.push(`${h}:${m}:00`);
      currMinutes += duracao;
    }
  }

  // Buscar agendamentos existentes para essa data
  const [agendamentos] = await db.query(`
    SELECT data_hora, status 
    FROM agendamentos 
    WHERE medico_id = ? 
      AND status = 'AGENDADO'
      AND data_hora LIKE ?
  `, [medico_id, `${data}%`]);

  const ocupadosSet = new Set(
    agendamentos.map(a => {
      // Extrair HH:mm:ss
      const dtStr = a.data_hora.toString();
      const timePart = dtStr.includes(' ') ? dtStr.split(' ')[1] : dtStr.split('T')[1]?.substring(0, 8);
      return timePart || dtStr;
    })
  );

  const horarios_livres = [];
  const horarios_ocupados = [];

  for (const slot of todosSlots) {
    if (ocupadosSet.has(slot)) {
      horarios_ocupados.push(slot.substring(0, 5));
    } else {
      horarios_livres.push(slot.substring(0, 5));
    }
  }

  return {
    medico_id: medico.id,
    medico_nome: medico.medico_nome,
    crm: medico.crm,
    especialidade: medico.especialidade,
    valor_consulta: medico.valor_consulta,
    data,
    dia_semana: diaSemana,
    total_livres: horarios_livres.length,
    horarios_livres,
    horarios_ocupados
  };
}

// 2. Tool Implementation: criar_agendamento (com RN01 - Bloqueio de Concorrência Atômico)
async function criarAgendamento({ paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio }) {
  if (!paciente_id || !medico_id || !data_hora || !tipo_pagamento) {
    return { erro: 'Dados incompletos para criação de agendamento.' };
  }

  // Normalizar data_hora para formato SQL YYYY-MM-DD HH:mm:ss
  let normalizedDataHora = data_hora.replace('T', ' ');
  if (normalizedDataHora.length === 16) {
    normalizedDataHora += ':00';
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // RN01: Verificação atômica de disponibilidade
    const [existentes] = await conn.query(`
      SELECT id FROM agendamentos 
      WHERE medico_id = ? 
        AND data_hora = ? 
        AND status = 'AGENDADO'
    `, [medico_id, normalizedDataHora]);

    if (existentes.length > 0) {
      await conn.rollback();
      conn.release();
      return {
        erro: 'HORARIO_INDISPONIVEL',
        mensagem: 'O horário selecionado acabou de ser reservado por outro paciente. Por favor, escolha outro horário ou entre na lista de espera.'
      };
    }

    // Inserir agendamento
    const [result] = await conn.query(`
      INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio, status)
      VALUES (?, ?, ?, ?, ?, 'AGENDADO')
    `, [paciente_id, medico_id, normalizedDataHora, tipo_pagamento, carteirinha_convenio || null]);

    await conn.commit();
    conn.release();

    return {
      sucesso: true,
      agendamento_id: result.insertId,
      mensagem: `Consulta agendada com sucesso para ${normalizedDataHora}.`,
      data_hora: normalizedDataHora,
      tipo_pagamento
    };
  } catch (error) {
    await conn.rollback();
    conn.release();
    throw error;
  }
}

// 3. Tool Implementation: cancelar_agendamento (com RN02 e RN03)
async function cancelarAgendamento({ agendamento_id, paciente_id }) {
  if (!agendamento_id) {
    return { erro: 'ID do agendamento é obrigatório.' };
  }

  // Buscar agendamento
  const [rows] = await db.query(
    'SELECT * FROM agendamentos WHERE id = ?',
    [agendamento_id]
  );

  if (rows.length === 0) {
    return { erro: 'Agendamento não encontrado.' };
  }

  const agendamento = rows[0];

  // Validação de permissão se paciente_id fornecido
  if (paciente_id && agendamento.paciente_id !== Number(paciente_id)) {
    return { erro: 'Você não tem permissão para cancelar este agendamento.' };
  }

  if (agendamento.status === 'CANCELADO') {
    return { mensagem: 'Esta consulta já estava cancelada.' };
  }

  // RN02: Trava dos 30 Minutos
  let dtStr = agendamento.data_hora.toString();
  let dataHoraConsulta;
  if (dtStr.includes('T')) {
    dataHoraConsulta = new Date(dtStr);
  } else {
    const [datePart, timePart] = dtStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, min, sec] = (timePart || '00:00:00').split(':').map(Number);
    dataHoraConsulta = new Date(year, month - 1, day, hour, min, sec || 0);
  }

  const agora = new Date();
  const diffMinutos = (dataHoraConsulta.getTime() - agora.getTime()) / (1000 * 60);

  if (diffMinutos < 30) {
    return {
      erro: 'BLOQUEIO_RN02',
      bloqueado: true,
      mensagem: 'O cancelamento automático foi bloqueado pois faltam menos de 30 minutos para o horário da consulta. Por favor, entre em contato telefônico diretamente com a nossa clínica pelo número (11) 3000-0000 para assistência imediata.'
    };
  }

  // Executar cancelamento
  await db.query(
    "UPDATE agendamentos SET status = 'CANCELADO', atualizado_em = NOW() WHERE id = ?",
    [agendamento_id]
  );

  // RN03: Disparo automático da fila de espera
  const dataDesejada = agendamento.data_hora.toString().substring(0, 10);
  const [filaRows] = await db.query(`
    SELECT * FROM fila_espera 
    WHERE medico_id = ? 
      AND data_desejada = ? 
      AND status = 'AGUARDANDO'
      AND posicao_fila = 1
    ORDER BY id ASC
    LIMIT 1
  `, [agendamento.medico_id, dataDesejada]);

  let pacienteFilaNotificado = null;
  if (filaRows.length > 0) {
    const pacienteFila = filaRows[0];
    await db.query(`
      UPDATE fila_espera 
      SET status = 'NOTIFICADO', horario_notificacao = NOW() 
      WHERE id = ?
    `, [pacienteFila.id]);
    pacienteFilaNotificado = pacienteFila.paciente_id;
  }

  return {
    sucesso: true,
    mensagem: 'Consulta cancelada com sucesso.',
    agendamento_id,
    fila_notificada: pacienteFilaNotificado ? `Paciente ID ${pacienteFilaNotificado} foi notificado sobre a nova vaga.` : 'Nenhum paciente aguardando na fila para esta data.'
  };
}

// Roteador de execução de ferramentas
async function executeTool(name, args) {
  switch (name) {
    case 'consultar_disponibilidade':
      return await consultarDisponibilidade(args);
    case 'criar_agendamento':
      return await criarAgendamento(args);
    case 'cancelar_agendamento':
      return await cancelarAgendamento(args);
    default:
      return { erro: `Ferramenta '${name}' desconhecida.` };
  }
}

module.exports = {
  toolDeclarations,
  executeTool,
  consultarDisponibilidade,
  criarAgendamento,
  cancelarAgendamento
};

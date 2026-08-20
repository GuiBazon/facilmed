const { get, query, run } = require('../config/database');

function parseDateTime(str) {
  if (!str) return new Date();
  const parts = str.split(/[\sT:-]/);
  if (parts.length >= 5) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), Number(parts[3]), Number(parts[4]), Number(parts[5] || 0));
  }
  return new Date(str);
}

/**
 * Ferramentas de Tool Calling da MedIA conforme o documento oficial do projeto
 */
async function executarToolCall(toolName, args, pacienteIdDefault = 1) {
  switch (toolName) {
    // Tool 1: Buscar Consultas do Paciente
    case 'buscar_consulta': {
      const pid = args.paciente_id || pacienteIdDefault;
      const consultas = await query(`
        SELECT a.*, m.nome as medico_nome, e.nome as especialidade_nome
        FROM agendamentos a
        JOIN medicos m ON a.medico_id = m.id
        JOIN especialidades e ON m.especialidade_id = e.id
        WHERE a.paciente_id = ? AND a.status != 'CANCELADO'
        ORDER BY a.data_hora ASC
      `, [pid]);

      return {
        total: consultas.length,
        consultas
      };
    }

    // Tool 2: Buscar Horários Disponíveis
    case 'buscar_horarios':
    case 'consultar_disponibilidade': {
      let { medico_id, data } = args;
      if (!medico_id) medico_id = 1;
      if (!data) {
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        data = amanha.toISOString().split('T')[0];
      }

      const medico = await get('SELECT m.id, m.nome, e.nome as especialidade FROM medicos m JOIN especialidades e ON m.especialidade_id = e.id WHERE m.id = ?', [medico_id]);
      if (!medico) return { erro: 'Médico não encontrado.' };

      const dateObj = new Date(data + 'T12:00:00');
      const diasSemanaMap = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
      const diaSemana = diasSemanaMap[dateObj.getDay()];

      if (diaSemana === 'DOM') {
        return { medico_nome: medico.nome, mensagem: 'A clínica não atende aos domingos.', horarios_disponiveis: [] };
      }

      const grades = await query('SELECT hora_inicio, hora_fim, duracao_minutos FROM horarios_medico WHERE medico_id = ? AND dia_semana = ?', [medico_id, diaSemana]);
      if (!grades || grades.length === 0) {
        return { medico_nome: medico.nome, mensagem: `Sem expediente para ${diaSemana}.`, horarios_disponiveis: [] };
      }

      const agendamentos = await query(`SELECT data_hora FROM agendamentos WHERE medico_id = ? AND status != 'CANCELADO' AND DATE(data_hora) = ?`, [medico_id, data]);
      const ocupados = agendamentos.map(a => a.data_hora.split(' ')[1]?.substring(0, 5));

      const disponiveis = [];
      for (const grade of grades) {
        let [h, m] = grade.hora_inicio.split(':').map(Number);
        const [hFim, mFim] = grade.hora_fim.split(':').map(Number);
        const duracao = grade.duracao_minutos || 30;

        while (h < hFim || (h === hFim && m < mFim)) {
          const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          if (!ocupados.includes(horaStr)) {
            disponiveis.push(horaStr);
          }
          m += duracao;
          if (m >= 60) {
            h += Math.floor(m / 60);
            m = m % 60;
          }
        }
      }

      return {
        medico_id: medico.id,
        medico_nome: medico.nome,
        especialidade: medico.especialidade,
        data,
        dia_semana: diaSemana,
        horarios_disponiveis: disponiveis
      };
    }

    // Tool 3: Agendar Consulta
    case 'agendar_consulta':
    case 'criar_agendamento': {
      const { paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio } = args;
      const pid = paciente_id || pacienteIdDefault;

      if (!medico_id || !data_hora) {
        return { erro: 'Parâmetros incompletos. Informe médico e data/horário.' };
      }

      // Trava de Concorrência (RN03)
      const conflito = await get(
        `SELECT id FROM agendamentos WHERE medico_id = ? AND data_hora = ? AND status != 'CANCELADO'`,
        [medico_id, data_hora]
      );

      if (conflito) {
        return { erro: 'Horário indisponível', mensagem: 'Infelizmente esse horário acabou de ser agendado por outro paciente.' };
      }

      const medico = await get('SELECT m.nome, e.nome as especialidade FROM medicos m JOIN especialidades e ON m.especialidade_id = e.id WHERE m.id = ?', [medico_id]);

      const result = await run(
        `INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio, status, confirmado_paciente) VALUES (?, ?, ?, ?, ?, 'AGENDADO', 1)`,
        [pid, medico_id, data_hora, tipo_pagamento || 'PARTICULAR', carteirinha_convenio || null]
      );

      // Log Audit
      await run(`INSERT INTO log_auditoria (usuario_id, acao, detalhes) VALUES (?, 'CRIAR_AGENDAMENTO_IA', ?)`, [pid, `Consulta agendada ID ${result.lastID} para ${data_hora}`]);

      return {
        sucesso: true,
        agendamento_id: result.lastID,
        medico_nome: medico?.nome || 'Médico',
        especialidade: medico?.especialidade,
        data_hora,
        mensagem: `Consulta agendada com sucesso com ${medico?.nome} para ${data_hora}!`
      };
    }

    // Tool 4: Cancelar Consulta
    case 'cancelar_consulta':
    case 'cancelar_agendamento': {
      const { agendamento_id } = args;
      if (!agendamento_id) return { erro: 'ID do agendamento não informado.' };

      const agendamento = await get('SELECT * FROM agendamentos WHERE id = ?', [agendamento_id]);
      if (!agendamento) return { erro: 'Agendamento não encontrado.' };

      if (agendamento.status === 'CANCELADO') return { mensagem: 'Esta consulta já estava cancelada.' };

      // Trava dos 30 min (RN01)
      const dataHoraConsulta = parseDateTime(agendamento.data_hora);
      const agora = new Date();
      const difMinutos = (dataHoraConsulta.getTime() - agora.getTime()) / (1000 * 60);

      if (difMinutos < 30) {
        return {
          bloqueado_rn01: true,
          erro: 'Regra RN01 — Cancelamento Bloqueado',
          mensagem: 'O cancelamento automático via aplicativo ou IA é permitido somente com pelo menos 30 minutos de antecedência. Para emergências com menos de 30 minutos, entre em contato com a recepção.'
        };
      }

      await run(`UPDATE agendamentos SET status = 'CANCELADO' WHERE id = ?`, [agendamento_id]);

      // Fila de Espera (RN02)
      const dataApenas = agendamento.data_hora.split(' ')[0];
      const proximoFila = await get(
        `SELECT * FROM fila_espera WHERE medico_id = ? AND data_desejada = ? AND status = 'AGUARDANDO' ORDER BY posicao_fila ASC LIMIT 1`,
        [agendamento.medico_id, dataApenas]
      );

      if (proximoFila) {
        const agoraIso = new Date().toISOString();
        await run(`UPDATE fila_espera SET status = 'NOTIFICADO', horario_notificacao = ? WHERE id = ?`, [agoraIso, proximoFila.id]);
      }

      await run(`INSERT INTO log_auditoria (usuario_id, acao, detalhes) VALUES (?, 'CANCELAR_AGENDAMENTO_IA', ?)`, [pacienteIdDefault, `Consulta ID ${agendamento_id} cancelada`]);

      return { sucesso: true, mensagem: 'Sua consulta foi cancelada com sucesso.' };
    }

    // Tool 5: Reagendar Consulta
    case 'reagendar_consulta': {
      const { agendamento_id, nova_data_hora } = args;
      if (!agendamento_id || !nova_data_hora) return { erro: 'Informe agendamento_id e nova_data_hora.' };

      const agendamento = await get('SELECT * FROM agendamentos WHERE id = ?', [agendamento_id]);
      if (!agendamento) return { erro: 'Agendamento não encontrado.' };

      // Verificar disponibilidade do novo horario (RN03)
      const conflito = await get(
        `SELECT id FROM agendamentos WHERE medico_id = ? AND data_hora = ? AND status != 'CANCELADO'`,
        [agendamento.medico_id, nova_data_hora]
      );
      if (conflito) return { erro: 'O novo horário escolhido não está mais disponível.' };

      await run(`UPDATE agendamentos SET data_hora = ? WHERE id = ?`, [nova_data_hora, agendamento_id]);
      await run(`INSERT INTO log_auditoria (usuario_id, acao, detalhes) VALUES (?, 'REAGENDAR_AGENDAMENTO_IA', ?)`, [pacienteIdDefault, `Consulta ID ${agendamento_id} alterada para ${nova_data_hora}`]);

      return { sucesso: true, mensagem: `Consulta reagendada com sucesso para ${nova_data_hora}!` };
    }

    // Tool 6: Confirmar Consulta pelo Paciente ou Responsável
    case 'confirmar_consulta': {
      const { agendamento_id } = args;
      await run(`UPDATE agendamentos SET confirmado_paciente = 1 WHERE id = ?`, [agendamento_id]);
      await run(`INSERT INTO log_auditoria (usuario_id, acao, detalhes) VALUES (?, 'CONFIRMAR_PRESENCA', ?)`, [pacienteIdDefault, `Consulta ID ${agendamento_id} confirmada`]);
      return { sucesso: true, mensagem: 'Presença confirmada com sucesso!' };
    }

    // Tool 7: Buscar Orientações Pré-Consulta ("O que levar")
    case 'buscar_orientacoes': {
      const { especialidade_id } = args;
      const esp = await get('SELECT nome, orientacoes_pre_consulta FROM especialidades WHERE id = ?', [especialidade_id || 1]);
      return {
        especialidade: esp?.nome,
        orientacoes: esp?.orientacoes_pre_consulta || 'Trazer documento de identidade e carteirinha do convênio.'
      };
    }

    // Tool 8: Buscar Responsáveis / Acompanhantes
    case 'buscar_responsavel': {
      const pid = args.paciente_id || pacienteIdDefault;
      const resp = await query(`
        SELECT r.*, u.nome as responsavel_nome, u.telefone as responsavel_telefone
        FROM responsaveis r
        JOIN usuarios u ON r.responsavel_id = u.id
        WHERE r.paciente_id = ?
      `, [pid]);
      return { responsaveis: resp };
    }

    default:
      return { erro: `Ferramenta '${toolName}' não reconhecida.` };
  }
}

/**
 * Processador Inteligente da MedIA (Ollama Local + Fallback Resiliente)
 */
async function processarChatMedIA(mensagemUsuario, historico = [], pacienteId = 1) {
  const systemPrompt = `Você é a MedIA, secretária virtual autônoma do FácilMed. Suas ferramentas disponíveis são: buscar_consulta, buscar_horarios, agendar_consulta, cancelar_consulta, reagendar_consulta, confirmar_consulta, buscar_orientacoes, buscar_responsavel. Seja acolhedora, objetiva e clara. Ao cancelar com <30m, informe a regra RN01.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historico.map(h => ({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text })),
          { role: 'user', content: mensagemUsuario }
        ]
      })
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.message?.content) {
        return { resposta: data.message.content, fonte: 'Ollama Llama3 (Local AI)' };
      }
    }
  } catch (e) {
    // Fallback NLP Local da MedIA
  }

  const texto = mensagemUsuario.toLowerCase();

  // 1. Orientação ("o que levar", "preparo", "instruções")
  if (texto.includes('levar') || texto.includes('orienta') || texto.includes('preparo') || texto.includes('documento')) {
    let espId = 1;
    if (texto.includes('cardio')) espId = 3;
    if (texto.includes('ortoped')) espId = 2;
    if (texto.includes('odonto')) espId = 1;
    if (texto.includes('geral')) espId = 4;

    const res = await executarToolCall('buscar_orientacoes', { especialidade_id: espId }, pacienteId);
    return {
      resposta: `📋 **Orientações para ${res.especialidade}:**\n\n${res.orientacoes}`,
      toolExecuted: 'buscar_orientacoes',
      toolResult: res
    };
  }

  // 2. Reagendamento ("remarcar", "reagendar", "mudar data")
  if (texto.includes('remarcar') || texto.includes('reagendar') || texto.includes('mudar')) {
    const agendamento = await get(`SELECT * FROM agendamentos WHERE paciente_id = ? AND status = 'AGENDADO' ORDER BY id DESC LIMIT 1`, [pacienteId]);
    if (!agendamento) {
      return { resposta: `Não encontrei agendamentos ativos para remarcar.` };
    }

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 2);
    const novaDataHora = `${amanha.toISOString().split('T')[0]} 11:00:00`;

    const res = await executarToolCall('reagendar_consulta', { agendamento_id: agendamento.id, nova_data_hora: novaDataHora }, pacienteId);
    return {
      resposta: `🔄 ${res.mensagem || res.erro}`,
      toolExecuted: 'reagendar_consulta',
      toolResult: res
    };
  }

  // 3. Confirmar Consulta
  if (texto.includes('confirmar') || texto.includes('vou ir') || texto.includes('presença')) {
    const agendamento = await get(`SELECT * FROM agendamentos WHERE paciente_id = ? AND status = 'AGENDADO' ORDER BY id DESC LIMIT 1`, [pacienteId]);
    if (!agendamento) return { resposta: `Nenhuma consulta pendente para confirmar.` };

    const res = await executarToolCall('confirmar_consulta', { agendamento_id: agendamento.id }, pacienteId);
    return {
      resposta: `✅ ${res.mensagem}`,
      toolExecuted: 'confirmar_consulta',
      toolResult: res
    };
  }

  // 4. Buscar / Minha Próxima Consulta
  if (texto.includes('minha') || texto.includes('proxima') || texto.includes('próxima') || texto.includes('quais consultas')) {
    const res = await executarToolCall('buscar_consulta', { paciente_id: pacienteId }, pacienteId);
    if (res.consultas && res.consultas.length > 0) {
      const c = res.consultas[0];
      return {
        resposta: `🗓️ **Sua próxima consulta:**\n\n📌 **Médico:** ${c.medico_nome} (${c.especialidade_nome})\n📅 **Data/Hora:** ${c.data_hora}\nStatus: ${c.status}`,
        toolExecuted: 'buscar_consulta',
        toolResult: res
      };
    } else {
      return { resposta: `Você não possui consultas futuras agendadas no momento.` };
    }
  }

  // 5. Horários / Disponibilidade
  if (texto.includes('horario') || texto.includes('horário') || texto.includes('disponiv') || texto.includes('vaga') || texto.includes('quando') || texto.includes('doutor') || texto.includes('dra')) {
    let medicoId = 1;
    if (texto.includes('roberto') || texto.includes('geral')) medicoId = 2;
    if (texto.includes('marcos') || texto.includes('ortoped')) medicoId = 3;
    if (texto.includes('camila') || texto.includes('odonto')) medicoId = 4;
    if (texto.includes('ana') || texto.includes('cardio')) medicoId = 1;

    const res = await executarToolCall('buscar_horarios', { medico_id: medicoId }, pacienteId);
    if (res.horarios_disponiveis && res.horarios_disponiveis.length > 0) {
      return {
        resposta: `Olá! Encontrei os seguintes horários vagos para **${res.medico_nome}** em **${res.data}**:\n👉 ${res.horarios_disponiveis.slice(0, 6).join(', ')}\n\nQual horário prefere?`,
        toolExecuted: 'buscar_horarios',
        toolResult: res
      };
    } else {
      return { resposta: `No momento o(a) **${res.medico_nome}** não possui horários livres para esta data. Deseja entrar na Fila de Espera (RN02)?` };
    }
  }

  // 6. Agendamento
  if (texto.includes('agendar') || texto.includes('marcar') || texto.includes('consulta') || texto.includes('quero')) {
    let medicoId = 1;
    if (texto.includes('roberto') || texto.includes('geral')) medicoId = 2;
    if (texto.includes('marcos') || texto.includes('ortoped')) medicoId = 3;
    if (texto.includes('camila') || texto.includes('odonto')) medicoId = 4;

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dateStr = amanha.toISOString().split('T')[0];
    const matchHora = texto.match(/(\d{2}):(\d{2})/);
    const hora = matchHora ? matchHora[0] : '09:00';
    const dataHoraStr = `${dateStr} ${hora}:00`;
    const isConvenio = texto.includes('convenio') || texto.includes('convênio');

    const res = await executarToolCall('agendar_consulta', {
      paciente_id: pacienteId,
      medico_id: medicoId,
      data_hora: dataHoraStr,
      tipo_pagamento: isConvenio ? 'CONVENIO' : 'PARTICULAR'
    }, pacienteId);

    if (res.sucesso) {
      return {
        resposta: `Prontinho! Sua consulta foi agendada! 🎉\n\n📌 **Médico:** ${res.medico_nome}\n📅 **Data/Hora:** ${res.data_hora}\n\nO comprovante já está salvo!`,
        toolExecuted: 'agendar_consulta',
        toolResult: res
      };
    } else {
      return { resposta: `Ops! ${res.mensagem || res.erro}` };
    }
  }

  // 7. Cancelamento
  if (texto.includes('cancelar') || texto.includes('desmarcar')) {
    const agendamento = await get(`SELECT * FROM agendamentos WHERE paciente_id = ? AND status = 'AGENDADO' ORDER BY id DESC LIMIT 1`, [pacienteId]);
    if (!agendamento) return { resposta: `Não encontrei consultas ativas para cancelar.` };

    const res = await executarToolCall('cancelar_consulta', { agendamento_id: agendamento.id }, pacienteId);
    return {
      resposta: res.sucesso ? `Consulta de **${agendamento.data_hora}** cancelada com sucesso.` : `⚠️ ${res.mensagem}`,
      toolExecuted: 'cancelar_consulta',
      toolResult: res
    };
  }

  // Saudação padrão
  return {
    resposta: `Olá! Eu sou a **MedIA**, a Secretária Virtual do FácilMed 👩‍⚕️.\n\nComo posso te ajudar hoje?\n\n• *"Quais minhas próximas consultas?"*\n• *"Ver horários com a Dra. Ana"*\n• *"O que levar para a consulta de Cardiologia?"*\n• *"Remarcar minha consulta"*`
  };
}

module.exports = {
  executarToolCall,
  processarChatMedIA
};

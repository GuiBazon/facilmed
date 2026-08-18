const { genAI, SYSTEM_INSTRUCTION, API_KEY } = require('../config/gemini');
const { toolDeclarations, executeTool } = require('../services/geminiTools');
const db = require('../config/database');

async function processChatMessage(req, res) {
  try {
    const { mensagem, historico = [], paciente_id } = req.body;
    const currentPacienteId = paciente_id || req.user?.id || 1;

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }

    // Se temos a chave de API do Gemini válida, usamos o SDK do Google
    if (genAI && API_KEY && API_KEY !== 'your_gemini_api_key_here') {
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: toolDeclarations }]
        });

        // Formatar histórico de mensagens
        const contents = [];
        if (Array.isArray(historico)) {
          for (const item of historico) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.text || item.content || '' }]
            });
          }
        }

        // Adicionar mensagem atual
        contents.push({
          role: 'user',
          parts: [{ text: `[Contexto: Paciente ID ${currentPacienteId}] ${mensagem}` }]
        });

        // Inicia chat ou gera conteúdo
        const chat = model.startChat({
          history: contents.slice(0, -1)
        });

        let result = await chat.sendMessage(contents[contents.length - 1].parts[0].text);
        let response = result.response;
        let functionCalls = response.functionCalls ? response.functionCalls() : [];

        const executedActions = [];

        // Loop de resolução de tool calls (Function Calling)
        while (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          console.log(`🤖 Gemini chamou ferramenta '${call.name}' com args:`, call.args);

          const toolArgs = { ...call.args };
          if (call.name === 'criar_agendamento' && !toolArgs.paciente_id) {
            toolArgs.paciente_id = currentPacienteId;
          }
          if (call.name === 'cancelar_agendamento' && !toolArgs.paciente_id) {
            toolArgs.paciente_id = currentPacienteId;
          }

          const toolResult = await executeTool(call.name, toolArgs);
          executedActions.push({
            tool: call.name,
            args: toolArgs,
            result: toolResult
          });

          // Retorna o resultado da ferramenta para o Gemini gerar a resposta amigável
          result = await chat.sendMessage([
            {
              functionResponse: {
                name: call.name,
                response: toolResult
              }
            }
          ]);

          response = result.response;
          functionCalls = response.functionCalls ? response.functionCalls() : [];
        }

        const replyText = response.text();

        return res.json({
          resposta: replyText,
          acoes_executadas: executedActions
        });
      } catch (geminiError) {
        console.warn('⚠️ Erro ao chamar API Gemini online, acionando fallback inteligente:', geminiError.message);
      }
    }

    // Fallback inteligente para desenvolvimento/offline
    const fallbackResponse = await handleLocalIntelligentFallback(mensagem, currentPacienteId);
    return res.json(fallbackResponse);
  } catch (error) {
    console.error('❌ Erro no controlador de chat:', error);
    return res.status(500).json({
      error: 'Ocorreu um erro ao processar sua solicitação no FácilMed.',
      detalhes: error.message
    });
  }
}

// Fallback inteligente com compreensão de linguagem natural para agendamento, consulta de horários e cancelamento
async function handleLocalIntelligentFallback(mensagem, pacienteId) {
  const lower = mensagem.toLowerCase();
  const executedActions = [];

  // Buscar todos os médicos e especialidades para contextualizar
  const [medicos] = await db.query(`
    SELECT m.id, u.nome AS medico_nome, e.nome AS especialidade, m.crm, m.valor_consulta
    FROM medicos m
    JOIN usuarios u ON m.usuario_id = u.id
    JOIN especialidades e ON m.especialidade_id = e.id
  `);

  // Extrair data se houver (ex: 2026-08-20 ou "amanhã" ou "hoje")
  let targetDate = null;
  const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b/;
  const matchDate = mensagem.match(dateRegex);

  const hoje = new Date();
  if (matchDate) {
    targetDate = matchDate[1];
  } else if (lower.includes('hoje')) {
    targetDate = hoje.toISOString().split('T')[0];
  } else if (lower.includes('amanhã') || lower.includes('amanha')) {
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    targetDate = amanha.toISOString().split('T')[0];
  } else {
    // Padrão: próximo dia útil
    const prox = new Date(hoje);
    prox.setDate(prox.getDate() + 1);
    if (prox.getDay() === 0) prox.setDate(prox.getDate() + 1);
    targetDate = prox.toISOString().split('T')[0];
  }

  // Identificar médico ou especialidade
  let matchedMedico = null;
  for (const m of medicos) {
    if (lower.includes(m.medico_nome.toLowerCase()) || lower.includes(m.especialidade.toLowerCase())) {
      matchedMedico = m;
      break;
    }
  }
  if (!matchedMedico && medicos.length > 0) {
    matchedMedico = medicos[0]; // fallback primeiro médico
  }

  // Identificar intenção: Cancelar
  if (lower.includes('cancelar') || lower.includes('desmarcar')) {
    const [agendamentos] = await db.query(`
      SELECT * FROM agendamentos 
      WHERE paciente_id = ? AND status = 'AGENDADO'
      ORDER BY data_hora ASC
      LIMIT 1
    `, [pacienteId]);

    if (agendamentos.length === 0) {
      return {
        resposta: 'Olá! Não localizei nenhuma consulta agendada em aberto para você no momento.',
        acoes_executadas: []
      };
    }

    const agendamento = agendamentos[0];
    const toolResult = await executeTool('cancelar_agendamento', {
      agendamento_id: agendamento.id,
      paciente_id: pacienteId
    });

    executedActions.push({
      tool: 'cancelar_agendamento',
      args: { agendamento_id: agendamento.id, paciente_id: pacienteId },
      result: toolResult
    });

    if (toolResult.bloqueado) {
      return {
        resposta: toolResult.mensagem,
        acoes_executadas: executedActions
      };
    }

    return {
      resposta: `Sua consulta agendada para ${agendamento.data_hora} foi cancelada com sucesso. Se precisar de um novo agendamento, estarei à disposição!`,
      acoes_executadas: executedActions
    };
  }

  // Identificar intenção: Agendar ou Confirmar
  if (lower.includes('marcar') || lower.includes('agendar') || lower.includes('confirmar') || lower.includes('quero às') || lower.includes('quero as')) {
    // Verificar se especificou horário
    const timeMatch = mensagem.match(/\b(\d{1,2})[h:](\d{2})?\b/i);
    let horaFormatada = '09:00:00';
    if (timeMatch) {
      const h = timeMatch[1].padStart(2, '0');
      const m = (timeMatch[2] || '00').padStart(2, '0');
      horaFormatada = `${h}:${m}:00`;
    }

    const dataHora = `${targetDate} ${horaFormatada}`;
    const tipoPagamento = lower.includes('convenio') || lower.includes('convênio') ? 'CONVENIO' : 'PARTICULAR';

    const toolResult = await executeTool('criar_agendamento', {
      paciente_id: pacienteId,
      medico_id: matchedMedico.id,
      data_hora: dataHora,
      tipo_pagamento: tipoPagamento
    });

    executedActions.push({
      tool: 'criar_agendamento',
      args: { paciente_id: pacienteId, medico_id: matchedMedico.id, data_hora: dataHora, tipo_pagamento: tipoPagamento },
      result: toolResult
    });

    if (toolResult.erro) {
      return {
        resposta: `Atenção: ${toolResult.mensagem || 'Não foi possível confirmar o agendamento neste horário.'}`,
        acoes_executadas: executedActions
      };
    }

    return {
      resposta: `Perfeito! Sua consulta com ${matchedMedico.medico_nome} (${matchedMedico.especialidade}) foi agendada para o dia ${targetDate} às ${horaFormatada.substring(0, 5)} (${tipoPagamento}).`,
      acoes_executadas: executedActions
    };
  }

  // Intenção Padrão: Consultar Disponibilidade
  const dispResult = await executeTool('consultar_disponibilidade', {
    medico_id: matchedMedico.id,
    data: targetDate
  });

  executedActions.push({
    tool: 'consultar_disponibilidade',
    args: { medico_id: matchedMedico.id, data: targetDate },
    result: dispResult
  });

  if (dispResult.horarios_livres && dispResult.horarios_livres.length > 0) {
    const slotsList = dispResult.horarios_livres.slice(0, 6).join(', ');
    return {
      resposta: `Olá! Localizei horários disponíveis para o(a) ${matchedMedico.medico_nome} (${matchedMedico.especialidade}) na data ${targetDate}:\n\n🕒 Horários livres: ${slotsList}.\n\nQual desses horários você prefere agendar?`,
      acoes_executadas: executedActions
    };
  } else {
    return {
      resposta: `Olá! O Dr(a). ${matchedMedico.medico_nome} não possui vagas livres para a data ${targetDate}. Gostaria de entrar na nossa fila de espera ou tentar outra data?`,
      acoes_executadas: executedActions
    };
  }
}

module.exports = {
  processChatMessage
};

const { genAI, MODEL_NAME, SYSTEM_INSTRUCTION, toolDeclarations } = require('../config/gemini');
const Agendamento = require('../models/Agendamento');
const Medico = require('../models/Medico');

async function executarToolCall(toolName, args) {
  switch (toolName) {
    case 'consultar_disponibilidade': {
      const { medico_id, data } = args;
      const medico = await Medico.findById(medico_id);
      if (!medico) {
        return { erro: 'Médico não encontrado.' };
      }

      const dataObj = new Date(data + 'T12:00:00');
      const diaMap = { 0: 'DOM', 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB' };
      const diaSemana = diaMap[dataObj.getDay()];

      if (diaSemana === 'DOM') {
        return { mensagem: 'Médico não atende aos domingos.', horarios_disponiveis: [] };
      }

      const horariosGrade = await Medico.getHorarios(medico_id);
      const horariosDoDia = horariosGrade.filter(h => h.dia_semana === diaSemana);

      if (horariosDoDia.length === 0) {
        return { mensagem: `Médico não possui horários neste dia (${diaSemana}).`, horarios_disponiveis: [] };
      }

      const agendamentos = await Agendamento.getHorariosOcupados(medico_id, data);
      const horariosOcupados = agendamentos.map(a => {
        const h = a.hora;
        return typeof h === 'string' ? h.substring(0, 5) : '';
      });

      const disponiveis = [];
      for (const grade of horariosDoDia) {
        let [h, m] = grade.hora_inicio.split(':').map(Number);
        const [hFim, mFim] = grade.hora_fim.split(':').map(Number);
        const duracao = grade.duracao_minutos;

        while (h < hFim || (h === hFim && m < mFim)) {
          const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          if (!horariosOcupados.includes(horaStr)) {
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
        medico_nome: medico.nome,
        especialidade: medico.especialidade_nome,
        data,
        dia_semana: diaSemana,
        horarios_disponiveis: disponiveis,
        horarios_ocupados: horariosOcupados,
      };
    }

    case 'criar_agendamento': {
      const { paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio } = args;

      const medico = await Medico.findById(medico_id);
      if (!medico) {
        return { erro: 'Médico não encontrado.' };
      }

      const result = await Agendamento.create({
        paciente_id: parseInt(paciente_id),
        medico_id: parseInt(medico_id),
        data_hora,
        tipo_pagamento,
        carteirinha_convenio: carteirinha_convenio || null,
      });

      if (result.error) {
        return { erro: result.error };
      }

      return {
        sucesso: true,
        mensagem: 'Agendamento realizado com sucesso!',
        agendamento_id: result.id,
        medico_nome: medico.nome,
        especialidade: medico.especialidade_nome,
        data_hora,
        tipo_pagamento,
      };
    }

    case 'cancelar_agendamento': {
      const { agendamento_id, paciente_id } = args;

      const result = await Agendamento.cancelar(parseInt(agendamento_id), parseInt(paciente_id));

      if (result.error) {
        return { erro: result.error };
      }

      return {
        sucesso: true,
        mensagem: 'Agendamento cancelado com sucesso.',
      };
    }

    default:
      return { erro: `Ferramenta desconhecida: ${toolName}` };
  }
}

async function processarChat(mensagens) {
  const model = genAI.models.get(MODEL_NAME);

  const contents = mensagens.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  let response = await model.generateContent({
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: toolDeclarations }],
    },
  });

  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    const candidate = response.candidates?.[0];
    if (!candidate) break;

    const functionCalls = candidate.content?.parts?.filter(p => p.functionCall);

    if (!functionCalls || functionCalls.length === 0) {
      const textPart = candidate.content?.parts?.find(p => p.text);
      return { response: textPart?.text || 'Desculpe, não consegui processar sua solicitação.' };
    }

    const functionResponses = [];
    for (const fc of functionCalls) {
      const { name, args } = fc.functionCall;
      console.log(`[Sofia] Executando tool call: ${name}`, args);

      const result = await executarToolCall(name, args);

      functionResponses.push({
        functionResponse: {
          name,
          response: result,
        },
      });
    }

    contents.push(candidate.content);
    contents.push({ role: 'function', parts: functionResponses });

    response = await model.generateContent({
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    iterations++;
  }

  const finalText = response.candidates?.[0]?.content?.parts?.find(p => p.text);
  return { response: finalText?.text || 'Processamento concluído.' };
}

module.exports = { processarChat };

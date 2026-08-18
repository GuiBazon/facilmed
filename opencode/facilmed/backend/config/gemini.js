const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `Você é a Sofia, a secretária virtual autônoma do aplicativo FácilMed. Sua função é atender pacientes, verificar disponibilidade de médicos e realizar, remarcar ou cancelar agendamentos.
Seja sempre cordial, concisa e clara.
Ao buscar horários, chame a ferramenta 'consultar_disponibilidade'. Se o horário solicitado estiver ocupado, informe e sugira os horários livres mais próximos.
Ao confirmar um agendamento, chame 'criar_agendamento'.
Se o paciente tentar cancelar uma consulta com menos de 30 minutos de antecedência em relação ao horário marcado, informe que as regras do sistema não permitem o cancelamento automático e oriente-o a ligar para a administração.`;

const toolDeclarations = [
  {
    name: 'consultar_disponibilidade',
    description: 'Consulta os horários disponíveis e ocupados para um médico em uma data específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        medico_id: {
          type: 'INTEGER',
          description: 'ID do médico no sistema',
        },
        data: {
          type: 'STRING',
          description: 'Data no formato YYYY-MM-DD',
        },
      },
      required: ['medico_id', 'data'],
    },
  },
  {
    name: 'criar_agendamento',
    description: 'Cria um novo agendamento de consulta para o paciente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paciente_id: {
          type: 'INTEGER',
          description: 'ID do paciente',
        },
        medico_id: {
          type: 'INTEGER',
          description: 'ID do médico',
        },
        data_hora: {
          type: 'STRING',
          description: 'Data e hora no formato YYYY-MM-DD HH:mm:ss',
        },
        tipo_pagamento: {
          type: 'STRING',
          description: 'Tipo de pagamento: CONVENIO ou PARTICULAR',
        },
        carteirinha_convenio: {
          type: 'STRING',
          description: 'Número da carteirinha do convênio (opcional)',
        },
      },
      required: ['paciente_id', 'medico_id', 'data_hora', 'tipo_pagamento'],
    },
  },
  {
    name: 'cancelar_agendamento',
    description: 'Cancela uma consulta existente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agendamento_id: {
          type: 'INTEGER',
          description: 'ID do agendamento a ser cancelado',
        },
        paciente_id: {
          type: 'INTEGER',
          description: 'ID do paciente proprietário do agendamento',
        },
      },
      required: ['agendamento_id', 'paciente_id'],
    },
  },
];

module.exports = { genAI, MODEL_NAME, SYSTEM_INSTRUCTION, toolDeclarations };

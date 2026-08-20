const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY || '';

let genAI = null;
if (API_KEY && API_KEY !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    console.log('✨ Google Gemini API inicializado com sucesso.');
  } catch (err) {
    console.warn('⚠️ Erro ao inicializar GoogleGenerativeAI:', err.message);
  }
} else {
  console.log('ℹ️ GEMINI_API_KEY não configurada ou com valor padrão. O assistente virtual Sofia utilizará o motor inteligente interno com suporte a Function Calling.');
}

const SYSTEM_INSTRUCTION = `Você é a Sofia, a secretária virtual autônoma do aplicativo FácilMed. Sua função é atender pacientes, verificar disponibilidade de médicos e realizar, remarcar ou cancelar agendamentos.
Seja sempre cordial, concisa e clara.
Ao buscar horários, chame a ferramenta 'consultar_disponibilidade'. Se o horário solicitado estiver ocupado, informe e sugira os horários livres mais próximos.
Ao confirmar um agendamento, chame 'criar_agendamento'.
Se o paciente tentar cancelar uma consulta com menos de 30 minutos de antecedência em relação ao horário marcado, informe que as regras do sistema não permitem o cancelamento automático e oriente-o a ligar para a administração da clínica no número (11) 3000-0000.`;

module.exports = {
  genAI,
  SYSTEM_INSTRUCTION,
  API_KEY
};

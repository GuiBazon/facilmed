const { initializeDatabase } = require('../src/database/seed');
const { run, get, query } = require('../src/config/database');
const { executarToolCall } = require('../src/services/aiService');
const { processarFilaEsperaExpirada } = require('../src/services/cronService');

async function testBusinessRules() {
  console.log('🧪 Iniciando testes de validação das Regras de Negócio FácilMed...\n');

  await initializeDatabase();

  let passouTodos = true;

  // --- TESTE 1: RN03 — Prevenção de Conflito de Horários ---
  console.log('🔹 Testando RN03 — Prevenção de Conflito de Horários...');
  const dataHoraTeste = '2026-09-01 10:00:00';
  
  // Limpar teste anterior se houver
  await run(`DELETE FROM agendamentos WHERE data_hora = '${dataHoraTeste}'`);

  // Primeiro agendamento deve ter sucesso
  const agendamento1 = await executarToolCall('criar_agendamento', {
    paciente_id: 1,
    medico_id: 1,
    data_hora: dataHoraTeste,
    tipo_pagamento: 'PARTICULAR'
  });

  if (!agendamento1.sucesso) {
    console.error('❌ Falha ao criar primeiro agendamento:', agendamento1);
    passouTodos = false;
  }

  // Segundo agendamento no MESMO horário deve ser BLOQUEADO pela RN03
  const agendamento2 = await executarToolCall('criar_agendamento', {
    paciente_id: 2,
    medico_id: 1,
    data_hora: dataHoraTeste,
    tipo_pagamento: 'CONVENIO'
  });

  if (agendamento2.erro === 'Horário indisponível') {
    console.log('✅ RN03 APROVADO: Bloqueou agendamento duplo no mesmo médico/horário!');
  } else {
    console.error('❌ RN03 FALHOU: Permitiu agendamento duplo!', agendamento2);
    passouTodos = false;
  }

  // --- TESTE 2: RN01 — Trava de Cancelamento Tardio (< 30 min) ---
  console.log('\n🔹 Testando RN01 — Trava dos 30 minutos para cancelamento...');

  // Criar consulta para daqui a 15 minutos (deve ser bloqueada ao tentar cancelar)
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() + 15);
  const pad = (n) => String(n).padStart(2, '0');
  const dataHoraTardia = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())} ${pad(agora.getHours())}:${pad(agora.getMinutes())}:00`;

  const agendamentoTardio = await run(
    `INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, status) VALUES (1, 1, '${dataHoraTardia}', 'PARTICULAR', 'AGENDADO')`
  );

  const tentativaCancelamento = await executarToolCall('cancelar_agendamento', {
    agendamento_id: agendamentoTardio.lastID
  });

  if (tentativaCancelamento.bloqueado_rn01) {
    console.log('✅ RN01 APROVADO: Bloqueou cancelamento a 15 min do horário marcado!');
  } else {
    console.error('❌ RN01 FALHOU: Permitiu cancelamento tardio!', tentativaCancelamento);
    passouTodos = false;
  }

  // --- TESTE 3: RN02 — Fila de Espera Sequencial e Expiração ---
  console.log('\n🔹 Testando RN02 — Fila de Espera Sequencial e Repasse de Vaga...');

  // Criar consulta no futuro (daqui a 5 dias) para testar cancelamento válido + repasse pra fila
  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 5);
  const dateStrFuturo = futuro.toISOString().split('T')[0];
  const dataHoraFuturo = `${dateStrFuturo} 14:00:00`;

  const agendamentoValido = await run(
    `INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, status) VALUES (1, 1, '${dataHoraFuturo}', 'PARTICULAR', 'AGENDADO')`
  );

  // Inserir Paciente 2 na Fila de Espera
  await run(`DELETE FROM fila_espera WHERE medico_id = 1 AND data_desejada = '${dateStrFuturo}'`);
  const itemFila = await run(
    `INSERT INTO fila_espera (paciente_id, medico_id, data_desejada, posicao_fila, status) VALUES (2, 1, '${dateStrFuturo}', 1, 'AGUARDANDO')`
  );

  // Cancelar consulta válida (>30 min)
  const cancelamentoValido = await executarToolCall('cancelar_agendamento', {
    agendamento_id: agendamentoValido.lastID
  });

  if (!cancelamentoValido.sucesso) {
    console.error('❌ Falha ao cancelar agendamento válido:', cancelamentoValido);
    passouTodos = false;
  }

  // Verificar se o Paciente 2 na Fila foi promovido para NOTIFICADO
  const itemFilaNotificado = await get('SELECT * FROM fila_espera WHERE id = ?', [itemFila.lastID]);
  if (itemFilaNotificado && itemFilaNotificado.status === 'NOTIFICADO') {
    console.log('✅ RN02 APROVADO (Parte 1): Paciente 1º da fila foi notificado automaticamente após cancelamento!');
  } else {
    console.error('❌ RN02 FALHOU (Parte 1): Fila não foi notificada.', itemFilaNotificado);
    passouTodos = false;
  }

  // Simular expiração de 1 hora no item notificado
  const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await run(`UPDATE fila_espera SET horario_notificacao = ? WHERE id = ?`, [duasHorasAtras, itemFila.lastID]);

  // Executar rotina Cron de expiração
  await processarFilaEsperaExpirada();

  const itemFilaExpirado = await get('SELECT * FROM fila_espera WHERE id = ?', [itemFila.lastID]);
  if (itemFilaExpirado && itemFilaExpirado.status === 'EXPIRADO') {
    console.log('✅ RN02 APROVADO (Parte 2): Notificação expirou após 1 hora sem resposta!');
  } else {
    console.error('❌ RN02 FALHOU (Parte 2): Não marcou como expirado.', itemFilaExpirado);
    passouTodos = false;
  }

  console.log('\n==================================================');
  if (passouTodos) {
    console.log('🎉 TODOS OS TESTES DAS REGRAS DE NEGÓCIO PASSARAM!');
  } else {
    console.error('⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE OS LOGS ACIMA.');
  }
  console.log('==================================================\n');

  process.exit(passouTodos ? 0 : 1);
}

testBusinessRules();

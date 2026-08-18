const assert = require('assert');
const db = require('../src/config/database');
const seed = require('../src/database/seed');
const { executeTool, consultarDisponibilidade, criarAgendamento, cancelarAgendamento } = require('../src/services/geminiTools');
const { processarFilaExpirada } = require('../src/services/cronService');

async function runTests() {
  console.log('🧪 Iniciando bateria de testes do FácilMed Backend...\n');

  // 1. Inicializar Banco e Seed
  console.log('--- TESTE 1: Inicialização e Seed ---');
  await db.initDatabase();
  await db.query('DELETE FROM agendamentos');
  await db.query('DELETE FROM fila_espera');
  await seed();

  const [users] = await db.query('SELECT * FROM usuarios');
  assert(users.length >= 3, 'Deve haver ao menos 3 usuários semeados');
  console.log(`✅ Seed verificado: ${users.length} usuários cadastrados.`);

  const [medicos] = await db.query('SELECT * FROM medicos');
  assert(medicos.length >= 1, 'Deve haver ao menos 1 médico cadastrado');
  const medicoTeste = medicos[0];
  console.log(`✅ Médico de teste selecionado: ID ${medicoTeste.id}, CRM ${medicoTeste.crm}`);

  // 2. Testar Consulta de Disponibilidade (Tool 1)
  console.log('\n--- TESTE 2: Consulta de Disponibilidade (Tool 1) ---');
  const targetDate = '2026-08-24'; // Segunda-feira
  const disp = await consultarDisponibilidade({ medico_id: medicoTeste.id, data: targetDate });
  assert(disp.horarios_livres && disp.horarios_livres.length > 0, 'Deve retornar horários livres');
  console.log(`✅ Horários livres encontrados para ${targetDate}: ${disp.horarios_livres.length} slots.`);

  // 3. Testar Regra RN01 (Bloqueio de Concorrência e Criação Atômica)
  console.log('\n--- TESTE 3: Regra RN01 (Bloqueio de Concorrência Atômica) ---');
  const slotEscolhido = `${targetDate} 09:00:00`;
  const paciente1 = users[0].id;
  const paciente2 = users[1].id;

  // Primeiro agendamento deve ter sucesso
  const res1 = await criarAgendamento({
    paciente_id: paciente1,
    medico_id: medicoTeste.id,
    data_hora: slotEscolhido,
    tipo_pagamento: 'PARTICULAR'
  });
  assert(res1.sucesso === true, 'Primeiro agendamento deve ser criado com sucesso');
  console.log(`✅ Agendamento 1 criado: ID ${res1.agendamento_id}`);

  // Segundo agendamento no MESMO horário deve ser bloqueado pela RN01
  const res2 = await criarAgendamento({
    paciente_id: paciente2,
    medico_id: medicoTeste.id,
    data_hora: slotEscolhido,
    tipo_pagamento: 'CONVENIO',
    carteirinha_convenio: 'CONV-12345'
  });
  assert(res2.erro === 'HORARIO_INDISPONIVEL', 'Segundo agendamento concorrente deve retornar erro HORARIO_INDISPONIVEL');
  console.log('✅ RN01 Validada com Sucesso: Concorrência bloqueada atomicamente!');

  // 4. Testar Regra RN02 (Trava dos 30 Minutos para Cancelamento)
  console.log('\n--- TESTE 4: Regra RN02 (Trava dos 30 Minutos) ---');
  // Cria agendamento para daqui a 15 minutos (formato local)
  const em15Min = new Date(Date.now() + 15 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const dataHora15Min = `${em15Min.getFullYear()}-${pad(em15Min.getMonth() + 1)}-${pad(em15Min.getDate())} ${pad(em15Min.getHours())}:${pad(em15Min.getMinutes())}:${pad(em15Min.getSeconds())}`;

  const [resSlotImediato] = await db.query(
    "INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, status) VALUES (?, ?, ?, 'PARTICULAR', 'AGENDADO')",
    [paciente1, medicoTeste.id, dataHora15Min]
  );
  const agendamentoImediatoId = resSlotImediato.insertId;

  const cancelImediato = await cancelarAgendamento({
    agendamento_id: agendamentoImediatoId,
    paciente_id: paciente1
  });

  assert(cancelImediato.bloqueado === true, 'Cancelamento a menos de 30 minutos deve ser bloqueado');
  console.log('✅ RN02 Validada com Sucesso: Cancelamento com < 30 min bloqueado com mensagem de orientação.');

  // 5. Testar Regra RN03 (Cancelamento com > 30 min e Fila de Espera)
  console.log('\n--- TESTE 5: Regras RN02 + RN03 (Cancelamento e Notificação da Fila) ---');
  // Coloca paciente2 na fila de espera para targetDate
  await db.query(
    "INSERT INTO fila_espera (paciente_id, medico_id, data_desejada, posicao_fila, status) VALUES (?, ?, ?, 1, 'AGUARDANDO')",
    [paciente2, medicoTeste.id, targetDate]
  );

  // Cancela o agendamento 1 (que é para 2026-08-24 > 30 min)
  const cancelOk = await cancelarAgendamento({
    agendamento_id: res1.agendamento_id,
    paciente_id: paciente1
  });

  assert(cancelOk.sucesso === true, 'Cancelamento com antecedência deve ser concluído');
  console.log('✅ Consulta cancelada com sucesso.');

  // Verifica se o paciente2 na fila foi alterado para 'NOTIFICADO'
  const [filaVerif] = await db.query(
    "SELECT * FROM fila_espera WHERE paciente_id = ? AND data_desejada = ?",
    [paciente2, targetDate]
  );
  assert(filaVerif[0].status === 'NOTIFICADO', 'Paciente na posição 1 da fila deve ser NOTIFICADO');
  assert(filaVerif[0].horario_notificacao !== null, 'horario_notificacao deve ser preenchido');
  console.log('✅ RN03 Validada: Paciente na fila recebeu status NOTIFICADO!');

  // 6. Testar Cron RN03 (Expiração após 60 minutos e reordenamento)
  console.log('\n--- TESTE 6: Cron de Expiração da Fila (> 60 min) ---');
  // Força horario_notificacao para 70 minutos atrás
  const setentaMinAtras = new Date(Date.now() - 70 * 60 * 1000).toISOString();
  await db.query(
    "UPDATE fila_espera SET horario_notificacao = ? WHERE id = ?",
    [setentaMinAtras, filaVerif[0].id]
  );

  // Adiciona paciente3 na fila com posicao_fila = 2
  const paciente3 = users[2].id;
  await db.query(
    "INSERT INTO fila_espera (paciente_id, medico_id, data_desejada, posicao_fila, status) VALUES (?, ?, ?, 2, 'AGUARDANDO')",
    [paciente3, medicoTeste.id, targetDate]
  );

  // Executa processamento de expiração
  await processarFilaExpirada();

  const [filaExpirada] = await db.query("SELECT * FROM fila_espera WHERE id = ?", [filaVerif[0].id]);
  assert(filaExpirada[0].status === 'EXPIRADO', 'Item deve ter mudado para EXPIRADO');

  const [filaProx] = await db.query("SELECT * FROM fila_espera WHERE paciente_id = ?", [paciente3]);
  assert(filaProx[0].posicao_fila === 1, 'Paciente 3 deve ter sido promovido para posicao_fila = 1');
  assert(filaProx[0].status === 'NOTIFICADO', 'Paciente 3 agora deve estar NOTIFICADO');
  console.log('✅ RN03 Cron Validado: Expiração de 60min, reordenamento e nova notificação executados!');

  // 7. Testar Tool Calling e Roteador Geral
  console.log('\n--- TESTE 7: Execução Dinâmica de Ferramentas (Tool Calling) ---');
  const toolCallTest = await executeTool('consultar_disponibilidade', { medico_id: medicoTeste.id, data: targetDate });
  assert(toolCallTest.medico_id === medicoTeste.id, 'Tool call execution deve retornar dados corretos');
  console.log('✅ Tool Calling executeTool validado!');

  console.log('\n🎉 TODOS OS TESTES DO BACKEND PASSARAM COM 100% DE SUCESSO!');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Falha nos testes do backend:', err);
    process.exit(1);
  });

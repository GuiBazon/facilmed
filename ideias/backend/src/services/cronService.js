const cron = require('node-cron');
const db = require('../config/database');

function initCronJobs() {
  console.log('⏰ Inicializando cron job da Fila de Espera (RN03 - Verificação a cada 1 minuto)...');

  cron.schedule('* * * * *', async () => {
    try {
      await processarFilaExpirada();
    } catch (err) {
      console.error('❌ Erro ao executar processarFilaExpirada:', err.message);
    }
  });
}

async function processarFilaExpirada() {
  // Busca notificações com mais de 60 minutos sem resposta
  // Suporta tanto SQLite quanto MySQL para cálculo de tempo
  const [expirados] = await db.query(`
    SELECT id, paciente_id, medico_id, data_desejada, horario_notificacao
    FROM fila_espera
    WHERE status = 'NOTIFICADO'
      AND (
        horario_notificacao <= datetime('now', '-60 minutes', 'localtime')
        OR horario_notificacao <= DATE_SUB(NOW(), INTERVAL 60 MINUTE)
      )
  `);

  if (expirados.length === 0) {
    return;
  }

  console.log(`⏳ Encontradas ${expirados.length} notificações de fila de espera expiradas (> 60 min). Processando...`);

  for (const item of expirados) {
    // 1. Marca como EXPIRADO
    await db.query("UPDATE fila_espera SET status = 'EXPIRADO' WHERE id = ?", [item.id]);
    console.log(`⚠️ Notificação da fila ID ${item.id} (Paciente ${item.paciente_id}) expirou.`);

    // 2. Reordena os demais colocados na fila
    await db.query(`
      UPDATE fila_espera 
      SET posicao_fila = posicao_fila - 1 
      WHERE medico_id = ? 
        AND data_desejada = ? 
        AND status = 'AGUARDANDO' 
        AND posicao_fila > 0
    `, [item.medico_id, item.data_desejada]);

    // 3. Notifica o próximo que assumiu a posição 1
    const [proximos] = await db.query(`
      SELECT id, paciente_id 
      FROM fila_espera 
      WHERE medico_id = ? 
        AND data_desejada = ? 
        AND status = 'AGUARDANDO' 
        AND posicao_fila = 1
      ORDER BY id ASC
      LIMIT 1
    `, [item.medico_id, item.data_desejada]);

    if (proximos.length > 0) {
      const novoNotificado = proximos[0];
      await db.query(`
        UPDATE fila_espera 
        SET status = 'NOTIFICADO', horario_notificacao = NOW() 
        WHERE id = ?
      `, [novoNotificado.id]);
      console.log(`🔔 Próximo paciente (ID ${novoNotificado.paciente_id}) foi notificado para Médico ${item.medico_id} na data ${item.data_desejada}!`);
    }
  }
}

module.exports = {
  initCronJobs,
  processarFilaExpirada
};

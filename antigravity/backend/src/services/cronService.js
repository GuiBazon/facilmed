const cron = require('node-cron');
const { query, run, get } = require('../config/database');

/**
 * Processa a fila de espera expirada (RN02)
 * Se o paciente notificado não confirmar em 1 hora (60 minutos), expira e notifica o próximo.
 */
async function processarFilaEsperaExpirada() {
  try {
    const umHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Buscar notificações expiradas
    const expirados = await query(
      `SELECT * FROM fila_espera WHERE status = 'NOTIFICADO' AND horario_notificacao <= ?`,
      [umHoraAtras]
    );

    for (const item of expirados) {
      console.log(`[RN02 - Cron] Notificação da fila ID ${item.id} expirou (passou de 1h). Repassando vaga...`);

      // Marcar como EXPIRADO
      await run(`UPDATE fila_espera SET status = 'EXPIRADO' WHERE id = ?`, [item.id]);

      // Reorganizar posições para a mesma data e médico
      await run(
        `UPDATE fila_espera SET posicao_fila = posicao_fila - 1 WHERE medico_id = ? AND data_desejada = ? AND posicao_fila > ? AND status = 'AGUARDANDO'`,
        [item.medico_id, item.data_desejada, item.posicao_fila]
      );

      // Notificar o próximo paciente (posicao 1 restante)
      const proximo = await get(
        `SELECT * FROM fila_espera WHERE medico_id = ? AND data_desejada = ? AND status = 'AGUARDANDO' ORDER BY posicao_fila ASC LIMIT 1`,
        [item.medico_id, item.data_desejada]
      );

      if (proximo) {
        const agoraIso = new Date().toISOString();
        await run(
          `UPDATE fila_espera SET status = 'NOTIFICADO', horario_notificacao = ? WHERE id = ?`,
          [agoraIso, proximo.id]
        );
        console.log(`[RN02 - Cron] Próximo paciente (ID da Fila ${proximo.id}) foi notificado com sucesso!`);
      }
    }
  } catch (err) {
    console.error('Erro ao processar cron da fila de espera:', err);
  }
}

function iniciarCronJobs() {
  // Executa a cada 1 minuto
  cron.schedule('* * * * *', () => {
    processarFilaEsperaExpirada();
  });
  console.log('⏰ Servidor Cron de Fila de Espera (RN02) iniciado.');
}

module.exports = {
  iniciarCronJobs,
  processarFilaEsperaExpirada
};

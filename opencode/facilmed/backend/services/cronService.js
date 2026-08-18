const cron = require('node-cron');
const FilaEspera = require('../models/FilaEspera');
const Medico = require('../models/Medico');

function iniciarCronJobs() {
  cron.schedule('* * * * *', async () => {
    try {
      console.log('[Cron] Verificando notificações expiradas na fila de espera...');

      const expirados = await FilaEspera.findNotificadosExpirados();

      if (expirados.length === 0) {
        return;
      }

      console.log(`[Cron] ${expirados.length} notificação(ões) expirada(s). Processando...`);

      for (const item of expirados) {
        console.log(
          `[Cron] Expirando notificação do paciente ${item.paciente_nome} (ID: ${item.paciente_id}) ` +
          `na fila do médico ${item.medico_id} para ${item.data_desejada}`
        );

        const posicao = item.posicao_fila;
        await FilaEspera.expirar(item.id);

        await FilaEspera.reordenar(item.medico_id, item.data_desejada, posicao);

        const proximo = await FilaEspera.findProximo(item.medico_id, item.data_desejada);
        if (proximo) {
          await FilaEspera.notificar(proximo.id);
          console.log(
            `[Cron] Notificando próximo da fila: ${proximo.paciente_nome} (ID: ${proximo.paciente_id}) ` +
            `— Posição: ${proximo.posicao_fila}`
          );
        }
      }

      console.log('[Cron] Processamento de expirações concluído.');
    } catch (error) {
      console.error('[Cron] Erro ao processar fila de espera:', error);
    }
  });

  console.log('[Cron] Job de fila de espera iniciado (verifica a cada minuto).');
}

module.exports = { iniciarCronJobs };

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./src/database/seed');
const { iniciarCronJobs } = require('./src/services/cronService');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Rota de Saude
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend FácilMed em execução 🚀' });
});

// Rotas da API
app.use('/api', apiRoutes);

async function startServer() {
  try {
    // 1. Inicializar e popular o Banco de Dados se necessário
    await initializeDatabase();

    // 2. Iniciar os Cron Jobs da Fila de Espera (RN02)
    iniciarCronJobs();

    // 3. Iniciar Servidor Express
    app.listen(PORT, () => {
      console.log(`
      ======================================================
      🚀 FácilMed API Backend Rodando!
      📡 URL: http://localhost:${PORT}/api
      🩺 Saúde: http://localhost:${PORT}/health
      🤖 Secretária IA: MedIA (Ollama + Smart Fallback)
      ======================================================
      `);
    });
  } catch (err) {
    console.error('Falha ao iniciar o servidor backend:', err);
  }
}

startServer();

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const seed = require('./database/seed');
const { initCronJobs } = require('./services/cronService');
const { authenticateToken, requireRole } = require('./middlewares/authMiddleware');

const authController = require('./controllers/authController');
const medicoController = require('./controllers/medicoController');
const agendamentoController = require('./controllers/agendamentoController');
const filaEsperaController = require('./controllers/filaEsperaController');
const chatController = require('./controllers/chatController');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Rota de Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', servico: 'FácilMed API', versao: '1.0.0', timestamp: new Date() });
});

// 1. Rotas de Autenticação
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.put('/api/auth/preferencias', authenticateToken, authController.updatePreferencias);

// 2. Rotas de Especialidades e Médicos (Públicas ou Autenticadas)
app.get('/api/especialidades', medicoController.listEspecialidades);
app.get('/api/medicos', medicoController.listMedicos);
app.get('/api/medicos/:id/disponibilidade', medicoController.getDisponibilidade);

// 3. Rotas de Agendamentos
app.post('/api/agendamentos', authenticateToken, agendamentoController.createAgendamento);
app.get('/api/agendamentos', authenticateToken, agendamentoController.listAgendamentosPaciente);
app.put('/api/agendamentos/:id/cancelar', authenticateToken, agendamentoController.cancelarAgendamentoController);

// 4. Rotas da Fila de Espera Dinâmica
app.post('/api/fila-espera', authenticateToken, filaEsperaController.entrarFilaEspera);
app.get('/api/fila-espera', authenticateToken, filaEsperaController.listFilaEspera);
app.post('/api/fila-espera/:id/confirmar', authenticateToken, filaEsperaController.confirmarVagaFila);

// 5. Rota do Chat de IA (Secretária Virtual Sofia com Google Gemini & Tool Calling)
app.post('/api/chat', authenticateToken, chatController.processChatMessage);

// 6. Rotas do Painel Médico
app.get('/api/medico/agenda', authenticateToken, requireRole('MEDICO', 'ADMIN'), medicoController.getAgendaMedico);
app.put('/api/medico/atendimento/:id', authenticateToken, requireRole('MEDICO', 'ADMIN'), medicoController.salvarProntuario);

// 7. Rotas Administrativas
app.post('/api/admin/medicos', authenticateToken, requireRole('ADMIN'), medicoController.cadastrarMedicoAdmin);
app.post('/api/admin/horarios', authenticateToken, requireRole('ADMIN'), medicoController.configurarGradeAdmin);

// Inicialização do Servidor
async function startServer() {
  try {
    await initDatabase();
    await seed();
    initCronJobs();

    app.listen(PORT, () => {
      console.log(`🚀 FácilMed API rodando na porta ${PORT} [http://localhost:${PORT}]`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor FácilMed:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const medicoController = require('../controllers/medicoController');
const agendamentoController = require('../controllers/agendamentoController');
const filaController = require('../controllers/filaController');
const relatorioController = require('../controllers/relatorioController');
const chatController = require('../controllers/chatController');
const { processarFilaEsperaExpirada } = require('../services/cronService');

// Auth & Usuarios
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.put('/auth/interface', authController.updateInterface);
router.get('/auth/users', authController.listUsers);

// Especialidades e Medicos
router.get('/especialidades', medicoController.getEspecialidades);
router.get('/medicos', medicoController.getMedicos);
router.get('/medicos/horarios', medicoController.getHorariosEStatusDia);
router.post('/medicos', medicoController.createMedico);
router.get('/stats/ocupacao', medicoController.getStatsOcupacaoClinica);

// Agendamentos
router.get('/agendamentos', agendamentoController.listAgendamentos);
router.post('/agendamentos', agendamentoController.createAgendamento);
router.post('/agendamentos/:id/cancelar', agendamentoController.cancelarAgendamento);
router.delete('/agendamentos/:id', agendamentoController.cancelarAgendamento);
router.put('/agendamentos/:id/anotacoes', agendamentoController.updateAnotacoesMedicas);

// Fila de Espera
router.get('/fila-espera', filaController.listFilaEspera);
router.post('/fila-espera', filaController.entrarFilaEspera);
router.post('/fila-espera/:id/confirmar', filaController.confirmarVagaFila);

// Trigger manual para simulacao de Cron da Fila
router.post('/fila-espera/processar-expiracao', async (req, res) => {
  await processarFilaEsperaExpirada();
  return res.json({ message: 'Processamento de expiração da fila de espera (RN02) concluído.' });
});

// Relatorios e Prontuarios
router.get('/relatorios', relatorioController.listRelatorios);
router.post('/relatorios', relatorioController.createRelatorio);

// Chat IA MedIA
router.post('/chat', chatController.handleChat);

module.exports = router;

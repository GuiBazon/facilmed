const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const { iniciarCronJobs } = require('./services/cronService');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const especialidadesRoutes = require('./routes/especialidades');
const medicosRoutes = require('./routes/medicos');
const agendamentosRoutes = require('./routes/agendamentos');
const filaEsperaRoutes = require('./routes/filaEspera');
const medicoRoutes = require('./routes/medico');
const chatRoutes = require('./routes/chat');
const usuariosRoutes = require('./routes/usuarios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/especialidades', especialidadesRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/fila-espera', filaEsperaRoutes);
app.use('/api/medico', medicoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await testConnection();
  iniciarCronJobs();

  app.listen(PORT, () => {
    console.log(`FácilMed Backend rodando na porta ${PORT}`);
  });
}

start().catch(console.error);

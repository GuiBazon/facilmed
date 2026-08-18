const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'facilmed_db',
    multipleStatements: true,
  });

  try {
    console.log('Populando banco de dados...');

    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const hashedMedico = await bcrypt.hash('medico123', 10);
    const hashedPaciente = await bcrypt.hash('paciente123', 10);

    await conn.query(`
      INSERT IGNORE INTO usuarios (cpf, nome, telefone, senha, tipo_usuario) VALUES
      ('000.000.000-00', 'Administrador Geral', '(11) 99999-0000', ?, 'ADMIN'),
      ('111.111.111-11', 'Dr. João Cardiologista', '(11) 98888-1111', ?, 'MEDICO'),
      ('222.222.222-22', 'Dra. Ana Ortopedista', '(11) 97777-2222', ?, 'MEDICO'),
      ('333.333.333-33', 'Dr. Pedro Neurologista', '(11) 96666-3333', ?, 'MEDICO'),
      ('444.444.444-44', 'Maria Paciente', '(11) 95555-4444', ?, 'PACIENTE'),
      ('555.555.555-55', 'José Paciente', '(11) 94444-5555', ?, 'PACIENTE'),
      ('666.666.666-66', 'Ana Paciente', '(11) 93333-6666', ?, 'PACIENTE')
    `, [hashedAdmin, hashedMedico, hashedMedico, hashedMedico, hashedPaciente, hashedPaciente, hashedPaciente]);

    console.log('Usuários criados.');

    await conn.query(`
      INSERT IGNORE INTO especialidades (nome, descricao) VALUES
      ('Cardiologia', 'Tratamento do coração e do sistema cardiovascular'),
      ('Ortopedia', 'Tratamento do sistema locomotor (ossos, músculos, articulações)'),
      ('Neurologia', 'Tratamento do sistema nervoso'),
      ('Pediatria', 'Atendimento de crianças e adolescentes'),
      ('Dermatologia', 'Tratamento de doenças da pele'),
      ('Clínico Geral', 'Atendimento clínico geral e preventivo')
    `);

    console.log('Especialidades criadas.');

    await conn.query(`
      INSERT IGNORE INTO medicos (usuario_id, crm, especialidade_id, valor_consulta) VALUES
      (2, 'CRM-12345/SP', 1, 250.00),
      (3, 'CRM-23456/SP', 2, 300.00),
      (4, 'CRM-34567/SP', 3, 350.00)
    `);

    console.log('Médicos criados.');

    const horariosTemplate = `
      INSERT IGNORE INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES
      (1, 'SEG', '08:00:00', '12:00:00', 30),
      (1, 'SEG', '14:00:00', '18:00:00', 30),
      (1, 'TER', '08:00:00', '12:00:00', 30),
      (1, 'QUA', '08:00:00', '12:00:00', 30),
      (1, 'QUI', '08:00:00', '12:00:00', 30),
      (1, 'QUI', '14:00:00', '18:00:00', 30),
      (1, 'SEX', '08:00:00', '12:00:00', 30),
      (2, 'SEG', '09:00:00', '13:00:00', 30),
      (2, 'TER', '09:00:00', '13:00:00', 30),
      (2, 'QUA', '14:00:00', '18:00:00', 30),
      (2, 'QUI', '09:00:00', '13:00:00', 30),
      (2, 'SEX', '14:00:00', '18:00:00', 30),
      (3, 'SEG', '10:00:00', '14:00:00', 45),
      (3, 'TER', '10:00:00', '14:00:00', 45),
      (3, 'QUA', '10:00:00', '14:00:00', 45),
      (3, 'QUI', '10:00:00', '14:00:00', 45),
      (3, 'SEX', '10:00:00', '14:00:00', 45)
    `;

    await conn.query(horariosTemplate);
    console.log('Horários médicos criados.');
    console.log('Seed concluído com sucesso!');

  } catch (error) {
    console.error('Erro no seed:', error.message);
  } finally {
    await conn.end();
  }
}

seed();

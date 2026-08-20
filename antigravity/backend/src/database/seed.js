const { exec, run, get } = require('../config/database');

async function initializeDatabase() {
  console.log('⚡ Criando tabelas expandidas do banco de dados FácilMed...');

  const schema = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpf TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      senha TEXT NOT NULL,
      telefone TEXT,
      data_nascimento TEXT,
      tipo_interface TEXT DEFAULT 'PADRAO',
      tipo_usuario TEXT DEFAULT 'PACIENTE',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS especialidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      icone TEXT,
      orientacoes_pre_consulta TEXT
    );

    CREATE TABLE IF NOT EXISTS medicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      nome TEXT NOT NULL,
      crm TEXT UNIQUE NOT NULL,
      especialidade_id INTEGER NOT NULL,
      valor_consulta REAL NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
    );

    CREATE TABLE IF NOT EXISTS horarios_medico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medico_id INTEGER NOT NULL,
      dia_semana TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      duracao_minutos INTEGER DEFAULT 30,
      FOREIGN KEY (medico_id) REFERENCES medicos(id)
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER NOT NULL,
      data_hora TEXT NOT NULL,
      tipo_pagamento TEXT NOT NULL,
      carteirinha_convenio TEXT,
      status TEXT DEFAULT 'AGENDADO',
      confirmado_paciente INTEGER DEFAULT 0,
      previsao_retorno_meses INTEGER DEFAULT 0,
      anotacoes_medicas TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
      FOREIGN KEY (medico_id) REFERENCES medicos(id)
    );

    CREATE TABLE IF NOT EXISTS responsaveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      responsavel_id INTEGER NOT NULL,
      parentesco TEXT DEFAULT 'Filtro/Responsável',
      permissao_visualizar INTEGER DEFAULT 1,
      permissao_agendar INTEGER DEFAULT 1,
      permissao_cancelar INTEGER DEFAULT 1,
      permissao_confirmar INTEGER DEFAULT 1,
      FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
      FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS fila_espera (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER NOT NULL,
      data_desejada TEXT NOT NULL,
      posicao_fila INTEGER NOT NULL,
      status TEXT DEFAULT 'AGUARDANDO',
      horario_notificacao TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
      FOREIGN KEY (medico_id) REFERENCES medicos(id)
    );

    CREATE TABLE IF NOT EXISTS relatorios_medicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agendamento_id INTEGER,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER NOT NULL,
      data_atendimento TEXT NOT NULL,
      resumo TEXT NOT NULL,
      receita TEXT,
      exames_solicitados TEXT,
      observacoes TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
      FOREIGN KEY (medico_id) REFERENCES medicos(id)
    );

    CREATE TABLE IF NOT EXISTS log_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      acao TEXT NOT NULL,
      detalhes TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await exec(schema);
  
  // Migrações seguras para tabelas existentes
  try { await exec(`ALTER TABLE agendamentos ADD COLUMN confirmado_paciente INTEGER DEFAULT 0;`); } catch(e) {}
  try { await exec(`ALTER TABLE agendamentos ADD COLUMN previsao_retorno_meses INTEGER DEFAULT 0;`); } catch(e) {}
  try { await exec(`ALTER TABLE especialidades ADD COLUMN orientacoes_pre_consulta TEXT;`); } catch(e) {}

  console.log('✅ Tabelas criadas e migradas com sucesso!');

  // Popula os dados iniciais caso a tabela usuarios esteja vazia
  const existingUser = await get('SELECT COUNT(*) as total FROM usuarios');
  if (existingUser.total === 0) {
    console.log('🌱 Populando dados demonstrativos...');

    // Usuários
    await run(`INSERT INTO usuarios (cpf, nome, senha, telefone, data_nascimento, tipo_interface, tipo_usuario) VALUES 
      ('111.111.111-11', 'Carlos Eduardo Silva', '123456', '(11) 98877-6655', '1990-05-14', 'PADRAO', 'PACIENTE'),
      ('222.222.222-22', 'Dona Maria de Lourdes', '123456', '(11) 97766-5544', '1948-03-22', 'SIMPLIFICADO', 'PACIENTE'),
      ('777.777.777-77', 'João Silva (Filho/Responsável)', '123456', '(11) 99988-1122', '1978-08-10', 'PADRAO', 'RESPONSAVEL'),
      ('333.333.333-33', 'Dra. Ana Paula Arcuri', '123456', '(11) 95544-3322', '1982-11-04', 'PADRAO', 'MEDICO'),
      ('444.444.444-44', 'Dr. Roberto Santos', '123456', '(11) 94433-2211', '1975-01-19', 'PADRAO', 'MEDICO'),
      ('555.555.555-55', 'Dr. Marcos Oliveira', '123456', '(11) 93322-1100', '1980-07-30', 'PADRAO', 'MEDICO'),
      ('666.666.666-66', 'Dra. Camila Fernandes', '123456', '(11) 92211-0099', '1988-12-15', 'PADRAO', 'MEDICO'),
      ('000.000.000-00', 'Administrador da Clínica', '123456', '(11) 91100-9988', '1985-04-12', 'PADRAO', 'ADMIN')
    `);

    // Responsável por Dona Maria (João Silva - ID 3 é responsável por Dona Maria - ID 2)
    await run(`INSERT INTO responsaveis (paciente_id, responsavel_id, parentesco, permissao_visualizar, permissao_agendar, permissao_cancelar, permissao_confirmar) VALUES 
      (2, 3, 'Filho / Cuidador Principal', 1, 1, 1, 1)
    `);

    // Especialidades com orientações pré-consulta ("O que levar")
    await run(`INSERT INTO especialidades (nome, descricao, icone, orientacoes_pre_consulta) VALUES 
      ('Odontologia', 'Saúde bucal, profilaxia, restaurações e tratamentos ortodônticos.', 'tooth', 'Trazer documento de identidade e escova de dentes. Chegar com 10 min de antecedência.'),
      ('Ortopedia', 'Diagnóstico e tratamento de ossos, articulações e lesões motoras.', 'bone', 'Trazer exames de imagem anteriores (Raio-X, Ressonância) e documento com foto.'),
      ('Cardiologia', 'Exames cardíacos, prevenção e acompanhamento hipertensivo.', 'heart-pulse', 'Jejum prévio de 8 horas se houver coleta de sangue. Trazer receita dos remédios de uso contínuo.'),
      ('Clínica Geral', 'Atendimento primário, exames de rotina e diagnósticos gerais.', 'user-doctor', 'Trazer documento com foto, carteirinha do convênio e lista de sintomas anotados.')
    `);

    // Médicos
    await run(`INSERT INTO medicos (usuario_id, nome, crm, especialidade_id, valor_consulta) VALUES 
      (4, 'Dra. Ana Paula Arcuri', 'CRM SP-123456', 3, 250.00), -- Cardiologia
      (5, 'Dr. Roberto Santos', 'CRM SP-654321', 4, 180.00),    -- Clínica Geral
      (6, 'Dr. Marcos Oliveira', 'CRM SP-789101', 2, 220.00),  -- Ortopedia
      (7, 'Dra. Camila Fernandes', 'CRM SP-112233', 1, 200.00) -- Odontologia
    `);

    // Horários Médicos
    const dias = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
    for (let medicoId = 1; medicoId <= 4; medicoId++) {
      for (const dia of dias) {
        await run(`INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES 
          (?, ?, '08:00', '12:00', 30),
          (?, ?, '13:00', '17:00', 30)
        `, [medicoId, dia, medicoId, dia]);
      }
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Agendamentos Iniciais
    await run(`INSERT INTO agendamentos (paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio, status, confirmado_paciente, previsao_retorno_meses, anotacoes_medicas) VALUES 
      (1, 1, '${dateStr} 09:00:00', 'CONVENIO', 'BRADESCO-987654', 'AGENDADO', 1, 6, NULL),
      (2, 2, '${dateStr} 10:30:00', 'PARTICULAR', NULL, 'AGENDADO', 0, 3, NULL),
      (1, 4, '2026-08-15 14:00:00', 'CONVENIO', 'BRADESCO-987654', 'CONCLUIDO', 1, 6, 'Paciente apresentou boa recuperação bucal. Recomendada limpeza periódica em 6 meses.')
    `);

    // Relatórios Médicos
    await run(`INSERT INTO relatorios_medicos (agendamento_id, paciente_id, medico_id, data_atendimento, resumo, receita, exames_solicitados, observacoes) VALUES 
      (3, 1, 4, '2026-08-15', 'Consulta Odontológica de Rotina', 'Enxaguante bucal sem álcool 2x ao dia', 'Radiografia panorâmica', 'Paciente sem queixas de dores.'),
      (NULL, 2, 1, '2026-08-10', 'Check-up Cardiológico Terceira Idade', 'Losartana 50mg 1x ao dia pela manhã', 'Eletrocardiograma, Ecocardiograma com Doppler', 'Pressão arterial 13/8. Mantida medicação de uso contínuo.')
    `);

    // Log de Auditoria Inicial
    await run(`INSERT INTO log_auditoria (usuario_id, acao, detalhes) VALUES 
      (1, 'CRIACAO_AGENDAMENTO', 'Consulta criada para Carlos Eduardo em ${dateStr} 09:00:00'),
      (3, 'CONFIRMACAO_RESPONSAVEL', 'João Silva (Responsável) confirmou presença para Dona Maria em ${dateStr} 10:30:00')
    `);

    console.log('✅ Dados expandidos inseridos com sucesso!');
  } else {
    console.log('ℹ️ Banco de dados já possui registros.');
  }
}

if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };

const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function seed() {
  console.log('🌱 Executando seed inicial do FácilMed...');
  await db.initDatabase();

  // 1. Inserir Especialidades
  const especialidades = [
    { nome: 'Cardiologia', descricao: 'Cuidados com a saúde do coração e sistema cardiovascular.' },
    { nome: 'Clínica Geral', descricao: 'Atendimento médico preventivo, diagnóstico e encaminhamentos.' },
    { nome: 'Pediatria', descricao: 'Acompanhamento da saúde de bebês, crianças e adolescentes.' },
    { nome: 'Ortopedia', descricao: 'Diagnóstico e tratamento de lesões nos ossos e articulações.' },
    { nome: 'Dermatologia', descricao: 'Tratamentos e cuidados com a pele, cabelos e unhas.' },
    { nome: 'Geriatria', descricao: 'Atenção especializada à saúde e bem-estar do idoso.' }
  ];

  for (const esp of especialidades) {
    const [rows] = await db.query('SELECT id FROM especialidades WHERE nome = ?', [esp.nome]);
    if (rows.length === 0) {
      await db.query('INSERT INTO especialidades (nome, descricao) VALUES (?, ?)', [esp.nome, esp.descricao]);
    }
  }

  // 2. Senha padrão criptografada
  const passwordHash = await bcrypt.hash('123456', 10);

  // 3. Usuários Médicos e Pacientes
  const usuarios = [
    // Paciente Padrão
    {
      cpf: '111.111.111-11',
      nome: 'Carlos Eduardo Silva',
      telefone: '(11) 98765-4321',
      senha: passwordHash,
      tipo_interface: 'PADRAO',
      tipo_usuario: 'PACIENTE'
    },
    // Paciente Idosa (Modo Simplificado)
    {
      cpf: '222.222.222-22',
      nome: 'Dona Maria de Lourdes',
      telefone: '(11) 91234-5678',
      senha: passwordHash,
      tipo_interface: 'SIMPLIFICADO',
      tipo_usuario: 'PACIENTE'
    },
    // Administrador
    {
      cpf: '000.000.000-00',
      nome: 'Administrador da Clínica',
      telefone: '(11) 99999-0000',
      senha: passwordHash,
      tipo_interface: 'PADRAO',
      tipo_usuario: 'ADMIN'
    },
    // Médicos
    {
      cpf: '333.333.333-33',
      nome: 'Dra. Ana Paula Arcuri',
      telefone: '(11) 97777-1111',
      senha: passwordHash,
      tipo_interface: 'PADRAO',
      tipo_usuario: 'MEDICO',
      medico: { crm: 'SP-123456', especialidade: 'Cardiologia', valor: 250.00 }
    },
    {
      cpf: '444.444.444-44',
      nome: 'Dr. Roberto Santos',
      telefone: '(11) 97777-2222',
      senha: passwordHash,
      tipo_interface: 'PADRAO',
      tipo_usuario: 'MEDICO',
      medico: { crm: 'SP-654321', especialidade: 'Clínica Geral', valor: 150.00 }
    },
    {
      cpf: '555.555.555-55',
      nome: 'Dra. Juliana Mendes',
      telefone: '(11) 97777-3333',
      senha: passwordHash,
      tipo_interface: 'PADRAO',
      tipo_usuario: 'MEDICO',
      medico: { crm: 'SP-789012', especialidade: 'Pediatria', valor: 200.00 }
    },
    {
      cpf: '666.666.666-66',
      nome: 'Dr. Fernando Albuquerque',
      telefone: '(11) 97777-4444',
      senha: passwordHash,
      tipo_interface: 'PADRAO',
      tipo_usuario: 'MEDICO',
      medico: { crm: 'SP-345678', especialidade: 'Ortopedia', valor: 220.00 }
    },
    {
      cpf: '777.777.777-77',
      nome: 'Dra. Beatriz Fontana',
      telefone: '(11) 97777-5555',
      senha: passwordHash,
      tipo_interface: 'PADRAO',
      tipo_usuario: 'MEDICO',
      medico: { crm: 'SP-901234', especialidade: 'Geriatria', valor: 180.00 }
    }
  ];

  for (const u of usuarios) {
    let [existing] = await db.query('SELECT id FROM usuarios WHERE cpf = ?', [u.cpf]);
    let userId;
    if (existing.length === 0) {
      const [res] = await db.query(
        'INSERT INTO usuarios (cpf, nome, telefone, senha, tipo_interface, tipo_usuario) VALUES (?, ?, ?, ?, ?, ?)',
        [u.cpf, u.nome, u.telefone, u.senha, u.tipo_interface, u.tipo_usuario]
      );
      userId = res.insertId;
    } else {
      userId = existing[0].id;
    }

    // Se for médico, cadastrar em 'medicos' e 'horarios_medico'
    if (u.medico) {
      const [espRows] = await db.query('SELECT id FROM especialidades WHERE nome = ?', [u.medico.especialidade]);
      const espId = espRows[0]?.id || 1;

      let [medExisting] = await db.query('SELECT id FROM medicos WHERE usuario_id = ?', [userId]);
      let medicoId;
      if (medExisting.length === 0) {
        const [mRes] = await db.query(
          'INSERT INTO medicos (usuario_id, crm, especialidade_id, valor_consulta) VALUES (?, ?, ?, ?)',
          [userId, u.medico.crm, espId, u.medico.valor]
        );
        medicoId = mRes.insertId;
      } else {
        medicoId = medExisting[0].id;
      }

      // Grade semanal padrão (SEG a SEX, 08:00 às 12:00 e 14:00 às 18:00)
      const dias = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
      for (const dia of dias) {
        const [gradeExists] = await db.query(
          'SELECT id FROM horarios_medico WHERE medico_id = ? AND dia_semana = ? AND hora_inicio = ?',
          [medicoId, dia, '08:00:00']
        );
        if (gradeExists.length === 0) {
          await db.query(
            'INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES (?, ?, ?, ?, ?)',
            [medicoId, dia, '08:00:00', '12:00:00', 30]
          );
          await db.query(
            'INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos) VALUES (?, ?, ?, ?, ?)',
            [medicoId, dia, '14:00:00', '18:00:00', 30]
          );
        }
      }
    }
  }

  console.log('✅ Seed executado com sucesso!');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erro no seed:', err);
      process.exit(1);
    });
}

module.exports = seed;

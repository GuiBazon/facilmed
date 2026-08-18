const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let dbClient = null;

// Armazenamento em JSON para modo autônomo offline caso o servidor MySQL não esteja em execução
class JsonRelationalDB {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      usuarios: [],
      especialidades: [],
      medicos: [],
      horarios_medico: [],
      agendamentos: [],
      fila_espera: [],
      auto_increment: {
        usuarios: 1,
        especialidades: 1,
        medicos: 1,
        horarios_medico: 1,
        agendamentos: 1,
        fila_espera: 1
      }
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (e) {
      console.warn('Erro ao carregar banco local JSON:', e.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Erro ao salvar banco local JSON:', e.message);
    }
  }

  reset() {
    this.data.agendamentos = [];
    this.data.fila_espera = [];
    this.save();
  }

  query(sql, params = []) {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase().replace(/\s+/g, ' ');

    if (upper.startsWith('DELETE FROM AGENDAMENTOS')) {
      this.data.agendamentos = [];
      this.save();
      return [{ affectedRows: 0 }, []];
    }
    if (upper.startsWith('DELETE FROM FILA_ESPERA')) {
      this.data.fila_espera = [];
      this.save();
      return [{ affectedRows: 0 }, []];
    }

    // 1. SELECT usuarios
    if (upper.includes('FROM USUARIOS WHERE CPF =')) {
      const cpf = params[0];
      const res = this.data.usuarios.filter(u => u.cpf === cpf);
      return [res, []];
    }
    if (upper.includes('FROM USUARIOS WHERE ID =')) {
      const id = Number(params[0]);
      const res = this.data.usuarios.filter(u => u.id === id);
      return [res, []];
    }
    if (upper.includes('FROM USUARIOS') && !upper.includes('WHERE')) {
      return [this.data.usuarios, []];
    }

    // 2. SELECT especialidades
    if (upper.includes('FROM ESPECIALIDADES WHERE NOME =')) {
      const nome = params[0];
      const res = this.data.especialidades.filter(e => e.nome === nome);
      return [res, []];
    }
    if (upper.includes('FROM ESPECIALIDADES') && !upper.includes('WHERE')) {
      return [this.data.especialidades, []];
    }

    // 3. SELECT medicos join usuarios e especialidades
    if (upper.includes('FROM MEDICOS M') && upper.includes('WHERE M.ID =')) {
      const id = Number(params[0]);
      const res = this.data.medicos
        .filter(m => m.id === id)
        .map(m => {
          const user = this.data.usuarios.find(u => u.id === m.usuario_id) || {};
          const esp = this.data.especialidades.find(e => e.id === m.especialidade_id) || {};
          return {
            id: m.id,
            usuario_id: m.usuario_id,
            crm: m.crm,
            valor_consulta: m.valor_consulta,
            medico_nome: user.nome || 'Dr(a)',
            telefone: user.telefone,
            especialidade: esp.nome || 'Geral',
            especialidade_id: m.especialidade_id
          };
        });
      return [res, []];
    }

    if (upper.includes('FROM MEDICOS M') && !upper.includes('WHERE M.ID =')) {
      let res = this.data.medicos.map(m => {
        const user = this.data.usuarios.find(u => u.id === m.usuario_id) || {};
        const esp = this.data.especialidades.find(e => e.id === m.especialidade_id) || {};
        return {
          id: m.id,
          usuario_id: m.usuario_id,
          crm: m.crm,
          valor_consulta: m.valor_consulta,
          medico_nome: user.nome || 'Dr(a)',
          telefone: user.telefone,
          especialidade: esp.nome || 'Geral',
          especialidade_id: m.especialidade_id
        };
      });
      if (upper.includes('WHERE M.ESPECIALIDADE_ID =')) {
        const espId = Number(params[0]);
        res = res.filter(x => x.especialidade_id === espId);
      }
      return [res, []];
    }

    if (upper.includes('FROM MEDICOS WHERE USUARIO_ID =')) {
      const uid = Number(params[0]);
      return [this.data.medicos.filter(m => m.usuario_id === uid), []];
    }
    if (upper.includes('FROM MEDICOS') && !upper.includes('WHERE')) {
      return [this.data.medicos, []];
    }

    // 4. Horarios Medico
    if (upper.includes('FROM HORARIOS_MEDICO WHERE MEDICO_ID =') && upper.includes('DIA_SEMANA =') && upper.includes('HORA_INICIO =')) {
      const [medId, dia, hora] = params;
      const res = this.data.horarios_medico.filter(h => h.medico_id === Number(medId) && h.dia_semana === dia && h.hora_inicio === hora);
      return [res, []];
    }
    if (upper.includes('FROM HORARIOS_MEDICO WHERE MEDICO_ID =') && upper.includes('DIA_SEMANA =')) {
      const [medId, dia] = params;
      const res = this.data.horarios_medico.filter(h => h.medico_id === Number(medId) && h.dia_semana === dia);
      return [res, []];
    }
    if (upper.includes('FROM HORARIOS_MEDICO WHERE MEDICO_ID =')) {
      const medId = Number(params[0]);
      return [this.data.horarios_medico.filter(h => h.medico_id === medId), []];
    }
    if (upper.includes('FROM HORARIOS_MEDICO') && !upper.includes('WHERE')) {
      return [this.data.horarios_medico, []];
    }

    // 5. Agendamentos
    if (upper.includes('FROM AGENDAMENTOS WHERE ID =')) {
      const id = Number(params[0]);
      return [this.data.agendamentos.filter(a => a.id === id), []];
    }

    if (upper.includes('FROM AGENDAMENTOS') && upper.includes('MEDICO_ID = ?') && upper.includes('DATA_HORA LIKE ?')) {
      const [medId, pattern] = params;
      const datePrefix = pattern.replace('%', '');
      const res = this.data.agendamentos.filter(a =>
        a.medico_id === Number(medId) &&
        a.status === 'AGENDADO' &&
        a.data_hora.startsWith(datePrefix)
      );
      return [res, []];
    }

    if (upper.includes('FROM AGENDAMENTOS') && upper.includes('MEDICO_ID = ?') && upper.includes('DATA_HORA = ?')) {
      const [medId, dataHora] = params;
      const res = this.data.agendamentos.filter(a =>
        a.medico_id === Number(medId) &&
        a.data_hora === dataHora &&
        a.status === 'AGENDADO'
      );
      return [res, []];
    }

    if (upper.includes('FROM AGENDAMENTOS A') && upper.includes('A.PACIENTE_ID =')) {
      const pid = Number(params[0]);
      const res = this.data.agendamentos
        .filter(a => a.paciente_id === pid)
        .map(a => {
          const med = this.data.medicos.find(m => m.id === a.medico_id);
          const userDoc = med ? this.data.usuarios.find(u => u.id === med.usuario_id) : null;
          const esp = med ? this.data.especialidades.find(e => e.id === med.especialidade_id) : null;
          return {
            ...a,
            medico_nome: userDoc?.nome || 'Médico',
            crm: med?.crm || '',
            especialidade: esp?.nome || 'Geral',
            valor_consulta: med?.valor_consulta || 150
          };
        });
      return [res, []];
    }

    if (upper.includes('FROM AGENDAMENTOS A') && upper.includes('A.MEDICO_ID =')) {
      const mid = Number(params[0]);
      const res = this.data.agendamentos
        .filter(a => a.medico_id === mid)
        .map(a => {
          const pac = this.data.usuarios.find(u => u.id === a.paciente_id) || {};
          return {
            ...a,
            paciente_nome: pac.nome || 'Paciente',
            paciente_cpf: pac.cpf || '',
            paciente_telefone: pac.telefone || '',
            tipo_interface: pac.tipo_interface || 'PADRAO'
          };
        });
      return [res, []];
    }
    if (upper.includes('FROM AGENDAMENTOS') && !upper.includes('WHERE')) {
      return [this.data.agendamentos, []];
    }

    // 6. Fila de espera
    if (upper.includes('SELECT MAX(POSICAO_FILA)')) {
      const [medId, dataDesejada] = params;
      const matches = this.data.fila_espera.filter(f =>
        f.medico_id === Number(medId) &&
        f.data_desejada === dataDesejada &&
        ['AGUARDANDO', 'NOTIFICADO'].includes(f.status)
      );
      const max_pos = matches.length > 0 ? Math.max(...matches.map(m => m.posicao_fila)) : 0;
      return [[{ max_pos }], []];
    }

    if (upper.includes('FROM FILA_ESPERA WHERE ID =')) {
      const id = Number(params[0]);
      return [this.data.fila_espera.filter(f => f.id === id), []];
    }

    if (upper.includes('FROM FILA_ESPERA') && upper.includes('MEDICO_ID = ?') && upper.includes('DATA_DESEJADA = ?') && upper.includes("STATUS = 'AGUARDANDO'") && upper.includes('POSICAO_FILA = 1')) {
      const [medId, dataDesejada] = params;
      const res = this.data.fila_espera.filter(f =>
        f.medico_id === Number(medId) &&
        f.data_desejada === dataDesejada &&
        f.status === 'AGUARDANDO' &&
        f.posicao_fila === 1
      );
      return [res, []];
    }

    if (upper.includes('FROM FILA_ESPERA') && upper.includes("STATUS = 'NOTIFICADO'")) {
      const now = new Date().getTime();
      const res = this.data.fila_espera.filter(f => {
        if (f.status !== 'NOTIFICADO' || !f.horario_notificacao) return false;
        const notifTime = new Date(f.horario_notificacao).getTime();
        return (now - notifTime) > (60 * 60 * 1000); // > 60 min
      });
      return [res, []];
    }

    if (upper.includes('FROM FILA_ESPERA WHERE PACIENTE_ID = ? AND DATA_DESEJADA = ?')) {
      const [pid, dataDes] = params;
      const res = this.data.fila_espera.filter(f => f.paciente_id === Number(pid) && f.data_desejada === dataDes);
      return [res, []];
    }

    if (upper.includes('FROM FILA_ESPERA WHERE PACIENTE_ID =')) {
      const pid = Number(params[0]);
      const res = this.data.fila_espera.filter(f => f.paciente_id === pid);
      return [res, []];
    }

    if (upper.includes('FROM FILA_ESPERA F')) {
      const res = this.data.fila_espera.map(f => {
        const pac = this.data.usuarios.find(u => u.id === f.paciente_id) || {};
        const med = this.data.medicos.find(m => m.id === f.medico_id) || {};
        const userDoc = this.data.usuarios.find(u => u.id === med.usuario_id) || {};
        return {
          ...f,
          paciente_nome: pac.nome || 'Paciente',
          medico_nome: userDoc.nome || 'Médico'
        };
      });
      return [res, []];
    }

    if (upper.includes('FROM FILA_ESPERA') && !upper.includes('WHERE')) {
      return [this.data.fila_espera, []];
    }

    // 7. INSERTS
    if (upper.startsWith('INSERT INTO USUARIOS')) {
      const [cpf, nome, telefone, senha, tipo_interface, tipo_usuario] = params;
      const id = this.data.auto_increment.usuarios++;
      const user = { id, cpf, nome, telefone, senha, tipo_interface: tipo_interface || 'PADRAO', tipo_usuario: tipo_usuario || 'PACIENTE', criado_em: new Date().toISOString() };
      this.data.usuarios.push(user);
      this.save();
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (upper.startsWith('INSERT INTO ESPECIALIDADES')) {
      const [nome, descricao] = params;
      const id = this.data.auto_increment.especialidades++;
      const esp = { id, nome, descricao };
      this.data.especialidades.push(esp);
      this.save();
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (upper.startsWith('INSERT INTO MEDICOS')) {
      const [usuario_id, crm, especialidade_id, valor_consulta] = params;
      const id = this.data.auto_increment.medicos++;
      const med = { id, usuario_id: Number(usuario_id), crm, especialidade_id: Number(especialidade_id), valor_consulta: Number(valor_consulta) };
      this.data.medicos.push(med);
      this.save();
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (upper.startsWith('INSERT INTO HORARIOS_MEDICO')) {
      const [medico_id, dia_semana, hora_inicio, hora_fim, duracao_minutos] = params;
      const id = this.data.auto_increment.horarios_medico++;
      const item = { id, medico_id: Number(medico_id), dia_semana, hora_inicio, hora_fim, duracao_minutos: Number(duracao_minutos || 30) };
      this.data.horarios_medico.push(item);
      this.save();
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (upper.startsWith('INSERT INTO AGENDAMENTOS')) {
      const [paciente_id, medico_id, data_hora, tipo_pagamento, carteirinha_convenio, status] = params;
      const id = this.data.auto_increment.agendamentos++;
      const item = {
        id,
        paciente_id: Number(paciente_id),
        medico_id: Number(medico_id),
        data_hora,
        tipo_pagamento: tipo_pagamento || 'PARTICULAR',
        carteirinha_convenio: carteirinha_convenio || null,
        status: status || 'AGENDADO',
        anotacoes_medicas: null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      this.data.agendamentos.push(item);
      this.save();
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    if (upper.startsWith('INSERT INTO FILA_ESPERA')) {
      let paciente_id = params[0];
      let medico_id = params[1];
      let data_desejada = params[2];
      let posicao_fila = params[3] !== undefined ? params[3] : 1;
      let status = params[4] || 'AGUARDANDO';

      // Se a query tiver literais como (..., 1, 'AGUARDANDO')
      if (upper.includes(", 1, 'AGUARDANDO')") || upper.includes(", 1, 'AGUARDANDO' )")) {
        posicao_fila = 1;
        status = 'AGUARDANDO';
      } else if (upper.includes(", 2, 'AGUARDANDO')") || upper.includes(", 2, 'AGUARDANDO' )")) {
        posicao_fila = 2;
        status = 'AGUARDANDO';
      }

      const id = this.data.auto_increment.fila_espera++;
      const item = {
        id,
        paciente_id: Number(paciente_id),
        medico_id: Number(medico_id),
        data_desejada,
        posicao_fila: Number(posicao_fila),
        status: status || 'AGUARDANDO',
        horario_notificacao: null,
        criado_em: new Date().toISOString()
      };
      this.data.fila_espera.push(item);
      this.save();
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    // 8. UPDATES
    if (upper.includes('UPDATE AGENDAMENTOS SET STATUS =') && upper.includes('WHERE ID =')) {
      const id = Number(params[params.length - 1]);
      const ag = this.data.agendamentos.find(a => a.id === id);
      if (ag) {
        if (upper.includes("'CANCELADO'")) ag.status = 'CANCELADO';
        if (upper.includes("'CONCLUIDO'")) ag.status = 'CONCLUIDO';
        if (upper.includes("'NAO_COMPARECEU'")) ag.status = 'NAO_COMPARECEU';
        ag.atualizado_em = new Date().toISOString();
        this.save();
        return [{ affectedRows: 1 }, []];
      }
    }

    if (upper.includes('UPDATE AGENDAMENTOS SET ANOTACOES_MEDICAS =')) {
      const [anotacoes, status, id] = params;
      const ag = this.data.agendamentos.find(a => a.id === Number(id));
      if (ag) {
        ag.anotacoes_medicas = anotacoes;
        if (status) ag.status = status;
        ag.atualizado_em = new Date().toISOString();
        this.save();
        return [{ affectedRows: 1 }, []];
      }
    }

    if (upper.includes('UPDATE FILA_ESPERA SET HORARIO_NOTIFICACAO =')) {
      const [horario, id] = params;
      const fila = this.data.fila_espera.find(f => f.id === Number(id));
      if (fila) {
        fila.horario_notificacao = horario;
        this.save();
        return [{ affectedRows: 1 }, []];
      }
    }

    if (upper.includes("UPDATE FILA_ESPERA SET STATUS = 'NOTIFICADO'")) {
      const id = Number(params[0]);
      const fila = this.data.fila_espera.find(f => f.id === id);
      if (fila) {
        fila.status = 'NOTIFICADO';
        fila.horario_notificacao = new Date().toISOString();
        this.save();
        return [{ affectedRows: 1 }, []];
      }
    }

    if (upper.includes("UPDATE FILA_ESPERA SET STATUS = 'EXPIRADO'")) {
      const id = Number(params[0]);
      const fila = this.data.fila_espera.find(f => f.id === id);
      if (fila) {
        fila.status = 'EXPIRADO';
        this.save();
        return [{ affectedRows: 1 }, []];
      }
    }

    if (upper.includes("UPDATE FILA_ESPERA SET STATUS = 'CONFIRMADO'")) {
      const id = Number(params[0]);
      const fila = this.data.fila_espera.find(f => f.id === id);
      if (fila) {
        fila.status = 'CONFIRMADO';
        this.save();
        return [{ affectedRows: 1 }, []];
      }
    }

    if (upper.includes('UPDATE FILA_ESPERA SET POSICAO_FILA = POSICAO_FILA - 1')) {
      const [medId, dataDesejada] = params;
      let count = 0;
      for (const f of this.data.fila_espera) {
        if (f.medico_id === Number(medId) && f.data_desejada === dataDesejada && f.status === 'AGUARDANDO' && f.posicao_fila > 0) {
          f.posicao_fila -= 1;
          count++;
        }
      }
      this.save();
      return [{ affectedRows: count }, []];
    }

    if (upper.includes('UPDATE USUARIOS SET TIPO_INTERFACE =')) {
      const [tipo, id] = params;
      const u = this.data.usuarios.find(x => x.id === Number(id));
      if (u) {
        u.tipo_interface = tipo;
        this.save();
        return [{ affectedRows: 1 }, []];
      }
    }

    return [[], []];
  }
}

let jsonDbInstance = null;

async function initDatabase() {
  if (dbClient) return dbClient;

  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'desafideias',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });

    const conn = await pool.getConnection();
    console.log('✅ Conectado com sucesso ao MySQL!');
    conn.release();
    dbClient = pool;
    return dbClient;
  } catch (mysqlErr) {
    console.warn('⚠️ Servidor MySQL local não detectado:', mysqlErr.message);
    console.log('🔄 Inicializando armazenamento relacional autônomo (desafideias_db.json) para desenvolvimento instantâneo...');

    const dbPath = path.resolve(__dirname, '../../desafideias_db.json');
    jsonDbInstance = new JsonRelationalDB(dbPath);

    dbClient = {
      isJsonDb: true,
      async query(sql, params = []) {
        return jsonDbInstance.query(sql, params);
      },
      async getConnection() {
        return {
          async beginTransaction() {},
          async commit() {},
          async rollback() {},
          async query(sql, params = []) {
            return jsonDbInstance.query(sql, params);
          },
          release() {}
        };
      }
    };

    console.log('✅ Armazenamento relacional inicializado em:', dbPath);
    return dbClient;
  }
}

module.exports = {
  initDatabase,
  getDb: () => dbClient,
  query: async (sql, params) => {
    if (!dbClient) await initDatabase();
    return dbClient.query(sql, params);
  },
  getConnection: async () => {
    if (!dbClient) await initDatabase();
    return dbClient.getConnection();
  }
};

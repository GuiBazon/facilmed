const express = require('express');
const Medico = require('../models/Medico');
const Agendamento = require('../models/Agendamento');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const DAY_MAP_REV = {
  0: 'DOM', 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB',
};

router.get('/', async (req, res) => {
  try {
    const medicos = await Medico.findAll();
    res.json(medicos);
  } catch (error) {
    console.error('Erro ao buscar médicos:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const medico = await Medico.findById(req.params.id);
    if (!medico) {
      return res.status(404).json({ error: 'Médico não encontrado.' });
    }
    res.json(medico);
  } catch (error) {
    console.error('Erro ao buscar médico:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/:id/horarios', async (req, res) => {
  try {
    const horarios = await Medico.getHorarios(req.params.id);
    res.json(horarios);
  } catch (error) {
    console.error('Erro ao buscar horários:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/:id/disponibilidade', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) {
      return res.status(400).json({ error: 'Parâmetro "data" é obrigatório (YYYY-MM-DD).' });
    }

    const medico = await Medico.findById(req.params.id);
    if (!medico) {
      return res.status(404).json({ error: 'Médico não encontrado.' });
    }

    const dataObj = new Date(data + 'T12:00:00');
    const diaSemanaIndex = dataObj.getDay();
    const diaSemana = DAY_MAP_REV[diaSemanaIndex];

    if (diaSemana === 'DOM') {
      return res.json({ horarios: [], mensagem: 'Médico não atende aos domingos.' });
    }

    const horariosGrade = await Medico.getHorarios(req.params.id);
    const horariosDoDia = horariosGrade.filter(h => h.dia_semana === diaSemana);

    if (horariosDoDia.length === 0) {
      return res.json({ horarios: [], mensagem: `Médico não possui horários disponíveis às ${diaSemana}.` });
    }

    const agendamentos = await Agendamento.getHorariosOcupados(req.params.id, data);

    const horarios = [];
    for (const grade of horariosDoDia) {
      const inicio = grade.hora_inicio;
      const fim = grade.hora_fim;
      const duracao = grade.duracao_minutos;

      let [h, m] = inicio.split(':').map(Number);
      const [hFim, mFim] = fim.split(':').map(Number);

      while (h < hFim || (h === hFim && m < mFim)) {
        const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const horaCompleta = `${horaStr}:00`;

        const ocupado = agendamentos.some(a => {
          const aHora = a.hora;
          if (typeof aHora === 'string') {
            return aHora.substring(0, 5) === horaStr;
          }
          return false;
        });

        horarios.push({
          hora: horaStr,
          hora_completa: `${data} ${horaCompleta}`,
          ocupado,
          duracao_minutos: duracao,
        });

        m += duracao;
        if (m >= 60) {
          h += Math.floor(m / 60);
          m = m % 60;
        }
      }
    }

    res.json({ data, medico_id: parseInt(req.params.id), horarios });
  } catch (error) {
    console.error('Erro ao buscar disponibilidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.post('/:id/horarios', authenticateToken, authorizeRoles('ADMIN', 'MEDICO'), async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fim, duracao_minutos } = req.body;

    if (!dia_semana || !hora_inicio || !hora_fim) {
      return res.status(400).json({ error: 'dia_semana, hora_inicio e hora_fim são obrigatórios.' });
    }

    const medico = await Medico.findById(req.params.id);
    if (!medico) {
      return res.status(404).json({ error: 'Médico não encontrado.' });
    }

    const horario = await Medico.addHorario({
      medico_id: parseInt(req.params.id),
      dia_semana,
      hora_inicio,
      hora_fim,
      duracao_minutos: duracao_minutos || 30,
    });

    res.status(201).json(horario);
  } catch (error) {
    console.error('Erro ao adicionar horário:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este horário já está cadastrado para o médico.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

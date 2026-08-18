const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
require('dotenv').config();

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { cpf, nome, telefone, senha, tipo_usuario, tipo_interface } = req.body;

    if (!cpf || !nome || !telefone || !senha) {
      return res.status(400).json({ error: 'CPF, nome, telefone e senha são obrigatórios.' });
    }

    const existing = await Usuario.findByCpf(cpf);
    if (existing) {
      return res.status(409).json({ error: 'CPF já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    const user = await Usuario.create({
      cpf,
      nome,
      telefone,
      senha: hashedPassword,
      tipo_usuario: tipo_usuario || 'PACIENTE',
      tipo_interface: tipo_interface || 'PADRAO',
    });

    const token = jwt.sign(
      { id: user.id, cpf: user.cpf, tipo_usuario: user.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ user: { ...user, senha: undefined }, token });
  } catch (error) {
    console.error('Erro no register:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { cpf, senha } = req.body;

    if (!cpf || !senha) {
      return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
    }

    const user = await Usuario.findByCpf(cpf);
    if (!user) {
      return res.status(401).json({ error: 'CPF ou senha incorretos.' });
    }

    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'CPF ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: user.id, cpf: user.cpf, tipo_usuario: user.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        cpf: user.cpf,
        nome: user.nome,
        telefone: user.telefone,
        tipo_usuario: user.tipo_usuario,
        tipo_interface: user.tipo_interface,
      },
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

CREATE DATABASE IF NOT EXISTS desafideias CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE desafideias;

-- Usuários (Pacientes, Médicos e Administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo_interface ENUM('PADRAO', 'SIMPLIFICADO') NOT NULL DEFAULT 'PADRAO',
    tipo_usuario ENUM('PACIENTE', 'MEDICO', 'ADMIN') NOT NULL DEFAULT 'PACIENTE',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuarios_cpf (cpf)
);

-- Especialidades Médicas
CREATE TABLE IF NOT EXISTS especialidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255) NULL
);

-- Médicos
CREATE TABLE IF NOT EXISTS medicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    crm VARCHAR(30) NOT NULL UNIQUE,
    especialidade_id INT NOT NULL,
    valor_consulta DECIMAL(10, 2) NOT NULL DEFAULT 150.00,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);

-- Grade de Atendimento dos Médicos
CREATE TABLE IF NOT EXISTS horarios_medico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL,
    dia_semana ENUM('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    duracao_minutos INT NOT NULL DEFAULT 30,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    UNIQUE KEY uq_medico_grade (medico_id, dia_semana, hora_inicio)
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    data_hora DATETIME NOT NULL,
    tipo_pagamento ENUM('CONVENIO', 'PARTICULAR') NOT NULL,
    carteirinha_convenio VARCHAR(50) NULL,
    status ENUM('AGENDADO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU') NOT NULL DEFAULT 'AGENDADO',
    anotacoes_medicas TEXT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
    FOREIGN KEY (medico_id) REFERENCES medicos(id),
    INDEX idx_busca_agenda (medico_id, data_hora, status)
);

-- Fila de Espera Dinâmica
CREATE TABLE IF NOT EXISTS fila_espera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    data_desejada DATE NOT NULL,
    posicao_fila INT NOT NULL,
    status ENUM('AGUARDANDO', 'NOTIFICADO', 'EXPIRADO', 'CONFIRMADO') NOT NULL DEFAULT 'AGUARDANDO',
    horario_notificacao DATETIME NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
    FOREIGN KEY (medico_id) REFERENCES medicos(id),
    INDEX idx_fila_processamento (medico_id, data_desejada, status, posicao_fila)
);

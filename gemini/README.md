# FácilMed — Sistema Inteligente de Agendamento de Consultas & Gestão Clínica

Sistema completo fullstack para agendamento de consultas médicas e gestão clínica integrada com IA (Google Gemini 2.5 Flash), composto por:
1. **Backend REST API (Node.js/Express)** com suporte a MySQL / armazenamento relacional resiliente, regras de negócio rigorosas (RN01, RN02, RN03) e agendador `node-cron`.
2. **Secretária Virtual Sofia (Google Gemini 2.5 Flash)** com Tool Calling (`consultar_disponibilidade`, `criar_agendamento`, `cancelar_agendamento`).
3. **Painel Web (React 18 + Vite + Tailwind CSS)** com Visão do Médico (agenda e prontuário rápido), Visão Administrativa e Portal do Paciente.
4. **Aplicativo Mobile (React Native / Expo)** com alternância dinâmica entre **Modo Padrão** e **Modo Simplificado (Acessibilidade para Idosos)**.

---

## 🚀 Como Executar o Projeto

### 1. Iniciar o Backend
```bash
cd backend
npm install
npm run seed     # Popula médicos, especialidades e usuários de teste
npm start        # Inicia a API na porta 5000 (http://localhost:5000)
```

Para rodar os testes automatizados de todas as regras de negócio:
```bash
npm run test
```

### 2. Iniciar o Painel Web (React + Tailwind)
```bash
cd web
npm install
npm run dev      # Inicia o frontend em http://localhost:3000
```

### 3. Iniciar o App Mobile (React Native Expo)
```bash
cd mobile
npm install
npx expo start
```

---

## 👥 Contas de Acesso Demonstrativo (Seed)

| Perfil | Nome | CPF | Senha | Detalhes |
|---|---|---|---|---|
| **Paciente (Padrão)** | Carlos Eduardo Silva | `111.111.111-11` | `123456` (ou `123`) | Modo Padrão |
| **Paciente (Sênior)** | Dona Maria de Lourdes | `222.222.222-22` | `123456` (ou `123`) | Modo Simplificado Ativo |
| **Médico (Cardiologia)** | Dra. Ana Paula Arcuri | `333.333.333-33` | `123456` (ou `123`) | CRM SP-123456 |
| **Médico (Clínica Geral)**| Dr. Roberto Santos | `444.444.444-44` | `123456` (ou `123`) | CRM SP-654321 |
| **Administrador** | Administrador da Clínica | `000.000.000-00` | `123456` (ou `123`) | Gestão de Médicos e Filas |

---

## 🛡️ Regras de Negócio Implementadas

- **RN01 — Bloqueio de Concorrência**: Agendamento atômico em transação SQL impedindo duplicidade no mesmo médico/horário.
- **RN02 — Trava dos 30 Minutos**: Bloqueio de cancelamento com menos de 30 minutos de antecedência orientando contato telefônico com a clínica.
- **RN03 — Fila de Espera Dinâmica com `node-cron`**: Quando uma consulta é cancelada, o primeiro paciente da fila é notificado (`status = 'NOTIFICADO'`). Se não responder em 60 minutos, expira (`status = 'EXPIRADO'`), decrementa as posições e notifica o próximo da fila.

---

## 🤖 Ferramentas do Google Gemini (Function Calling)

- `consultar_disponibilidade`: `{ medico_id: number, data: "YYYY-MM-DD" }`
- `criar_agendamento`: `{ paciente_id: number, medico_id: number, data_hora: "YYYY-MM-DD HH:mm:ss", tipo_pagamento: "CONVENIO" | "PARTICULAR", carteirinha_convenio?: string }`
- `cancelar_agendamento`: `{ agendamento_id: number, paciente_id: number }`

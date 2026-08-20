# 📖 Instruções Simplificadas do Projeto FácilMed (Backup)

Este documento traz o resumo prático e direto para rodar, testar e apresentar o **FácilMed**.

---

## 🚀 1. Como Iniciar o Projeto (2 Passos)

### Passo 1: Iniciar o Backend (API REST + Banco SQLite + Servidor Cron + IA MedIA)
```bash
cd backend
npm install
npm start
```
- **Endereço da API:** `http://localhost:5000/api`
- **Banco de Dados:** Criado e populado automaticamente na raiz do backend (`facilmed.sqlite`).

### Passo 2: Iniciar o Frontend (Interface React 18 + Vite)
```bash
cd web
npm install
npm run dev
```
- **Endereço da Interface Web:** `http://localhost:3000`

---

## 🧪 2. Como Rodar os Testes Automatizados das Regras de Negócio

Para testar no terminal a validação das regras **RN01** (Trava de 30 min), **RN02** (Fila Sequencial) e **RN03** (Conflito de Horário Duplo):

```bash
cd backend
npm test
```

---

## 👥 3. Contas de Acesso Demonstrativo (Troca de Perfil no Topo da Tela)

| Perfil | Nome | CPF | O que demonstra |
|---|---|---|---|
| **Paciente (Idosa)** | Dona Maria de Lourdes | `222.222.222-22` | **Modo Simplificado / Idosos** (Letras de 24px+, botões gigantes e voz). |
| **Paciente (Padrão)** | Carlos Eduardo Silva | `111.111.111-11` | App Mobile padrão com calendário por cores e convênio/particular. |
| **Responsável** | João Silva (Filho) | `777.777.777-77` | **Perfil do Acompanhante** (Gerecia consultas da mãe Dona Maria). |
| **Médico (Cardiologia)** | Dra. Ana Paula Arcuri | `333.333.333-33` | Agenda médica diária e Prontuário Eletrônico. |
| **Gestão Administrativa** | Administrador da Clínica | `000.000.000-00` | Taxa de ocupação, card "Receita Salva" e Fila de Espera. |

---

## 🤖 4. Como Testar a Secretária Virtual MedIA no Chat

Clique no botão verde de chat ou abra o **Modo Pessoas Cegas (Voz)** e envie uma dessas frases:

- **Para Agendar:** *"Quero agendar consulta com Dr. Roberto amanhã às 09:00 no convênio"*
- **Para Consultar Vagas:** *"Quais horários a Dra. Ana tem livres?"*
- **Para Orientações:** *"O que levar para a consulta de Cardiologia?"*
- **Para Cancelar:** *"Quero cancelar minha consulta"*
- **Para Confirmar:** *"Confirmar minha presença"*

---

## 🛡️ 5. Resumo das Regras de Negócio Críticas

1. **RN01 — Trava dos 30 minutos**: Bloqueia cancelamento automático no app/IA se faltarem menos de 30 minutos para a consulta.
2. **RN02 — Fila de Espera Sequencial**: Notifica **apenas o 1º da fila** após um cancelamento com janela de 1 hora para confirmar antes de expirar.
3. **RN03 — Bloqueio de Conflito**: Trava atômica no banco de dados que impede agendamento duplo do mesmo médico/horário.

---

## 📊 6. Slides para o Pitch do SENAI (Gamma.app)

O arquivo `pitch_slides.md` contém o **Master Prompt pronto** para você copiar e colar no site [Gamma.app](https://gamma.app) e gerar os slides da apresentação do **Guilherme e da Sofia** automaticamente!

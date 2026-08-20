# FácilMed — Sistema Inteligente de Agendamento de Consultas & Gestão Clínica

**FácilMed** é uma plataforma fullstack multiplataforma focada em erradicar o absenteísmo em clínicas multiprofissionais, automatizar o fluxo de agendamentos e substituir o atendimento manual da recepção por uma **Secretária Virtual baseada em Inteligência Artificial Local (MedIA / Ollama)**, além de promover acessibilidade digital completa para a terceira idade.

---

## 🚀 Como Executar o Projeto

### 1. Iniciar o Backend (Node.js + Express + SQLite + Cron)
```bash
cd backend
npm install
npm run test     # Executa os testes automatizados das regras de negócio (RN01, RN02, RN03)
npm start        # Inicia a API REST na porta 5000 (http://localhost:5000)
```
*O banco de dados SQLite (`facilmed.sqlite`) é criado e populado automaticamente no primeiro start.*

### 2. Iniciar o Frontend Web (React 18 + Vite)
```bash
cd web
npm install
npm run dev      # Inicia a aplicação na porta 3000 (http://localhost:3000)
```

---

## 👥 Contas Demonstrativas para Apresentação

| Perfil | Nome | CPF | Senha | Funcionalidade Principal |
|---|---|---|---|---|
| **Paciente (Padrão)** | Carlos Eduardo Silva | `111.111.111-11` | `123456` | App Mobile Modo Padrão |
| **Paciente (Idoso / Sênior)** | Dona Maria de Lourdes | `222.222.222-22` | `123456` | **Modo Simplificado / Idosos Ativo** (botões grandes, 24px+) |
| **Médico (Cardiologia)** | Dra. Ana Paula Arcuri | `333.333.333-33` | `123456` | Agenda Diária e Registro de Prontuário |
| **Médico (Clínica Geral)** | Dr. Roberto Santos | `444.444.444-44` | `123456` | Prontuário Médico e Prescrição |
| **Gestão Administrativa** | Administrador da Clínica | `000.000.000-00` | `123456` | Ocupação, cadastro de médicos e Fila de Espera |

---

## 🛡️ Regras de Negócio Críticas Implementadas

1. **RN01 — Trava de Cancelamento Tardio (< 30 min)**:
   - Bloqueia cancelamento automático via App ou IA MedIA se faltarem menos de 30 minutos para a consulta. Exige contato com a recepção.
2. **RN02 — Fila de Espera Dinâmica e Sequencial**:
   - Se uma consulta é cancelada, o sistema notifica **apenas o 1º colocado** da fila de espera (`status = 'NOTIFICADO'`).
   - O paciente tem **uma janela de 1 hora** para confirmar a vaga. Se expirar, repassa a vaga para o próximo da fila.
3. **RN03 — Prevenção de Conflitos de Horário (Trava Atômica SQL)**:
   - Validação atômica impede que dois pacientes ou a IA agendem o mesmo médico no mesmo dia/horário.

---

## 🤖 Secretária Virtual MedIA (Ollama AI + Fallback Resiliente)

- Suporta integração direta com **Ollama local** (`http://localhost:11434`) com Tool Calling (`consultar_disponibilidade`, `criar_agendamento`, `cancelar_agendamento`).
- Possui **Motor NLP de Fallback Integrado** para garantir 100% de disponibilidade no pitch de apresentação mesmo sem o serviço Ollama em execução.

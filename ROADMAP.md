# 🗺️ Roadmap: Orbit CRM (2025 Edition)

> **Visão do Projeto:** Uma plataforma de CRM "Full-Cycle", simulando um ambiente corporativo real. O sistema utiliza **Arquitetura Orientada a Eventos**, **Segurança Ofensiva**, **Processamento Assíncrono** e **Gestão de Arquivos em Nuvem**.

---

## 💎 Pilares Técnicos & Parâmetros de Mercado

1.  **Storage Seguro & Performático:** Uploads de arquivos (Contratos/Propostas) usando **Presigned URLs**. O backend apenas autoriza, o frontend envia direto para o Object Storage (S3/MinIO).
2.  **Assincronicidade (Background Jobs):** Emails e tarefas pesadas são processados por Workers (BullMQ + Redis), nunca bloqueando a API.
3.  **Rastreabilidade (Audit Logs):** Cada alteração de dado gera um rastro imutável ("Quem, Quando, Onde").
4.  **UX "Keyboard-First":** Navegação via Command Palette (`Cmd+K`) e Colaboração em Tempo Real (WebSockets).
5.  **RBAC (Role-Based Access Control):** Isolamento estrito de dados entre Times e Níveis Hierárquicos.

---

## 🛠️ Tech Stack "State-of-the-Art" (Dezembro 2025)

| Camada            | Tecnologia     | Versão       | Justificativa de Mercado                    |
| :---------------- | :------------- | :----------- | :------------------------------------------ |
| **Runtime**       | Node.js        | **v24.12.0** | Estabilidade LTS.                           |
| **Framework**     | Fastify        | **v5.6.2**   | Baixa latência.                             |
| **Storage**       | AWS S3 / MinIO | **SDK v3**   | Padrão da indústria para arquivos.          |
| **Queues**        | BullMQ         | **v5.12**    | Gerenciamento robusto de filas sobre Redis. |
| **Database**      | PostgreSQL     | **v17.2**    | ACID Compliance.                            |
| **Frontend**      | React          | **v19.2**    | React Compiler.                             |
| **UX Navigation** | cmdk           | **v1.0**     | Command Palette acessível.                  |
| **Infra**         | Kubernetes     | **v1.31+**   | Orquestração.                               |

---

## 🚩 Milestone 0: Fundação, Arquitetura e Ambiente Seguro

**Objetivo:** Base sólida com suporte a Storage Local.

- [ ] **0.1 Setup do Monorepo**
  - Estrutura `/server`, `/web`, `/k8s`, `/docs`.
- [ ] **0.2 Tooling & Quality Gates**
  - ESLint 9, Prettier, Husky.
- [ ] **0.3 🛡️ Hardening & Env Validation**
  - Zod para env vars. Fastify Helmet.
- [ ] **0.4 Dockerização (Infra Local)**
  - `docker-compose.yml`:
    - `postgres:17-alpine` (Banco).
    - `redis:7-alpine` (Filas).
    - **`minio/minio`** (S3 Compatible Storage Local).
- [ ] **0.5 Hello World TDD**
  - Rota `/health`.
- [ ] 🏷️ **TAG:** `git tag -a v0.1.0 -m "Milestone 0: Foundation"`

---

## 🚩 Milestone 1: Identidade, Hierarquia e Acesso (Auth + RBAC)

**Objetivo:** Autenticação segura com suporte nativo a Cargos e Times.

- [ ] **1.1 📐 Modelagem de Domínio (Roles & Teams)**
  - Schema Prisma: `User`, `Team`, `Role` (MANAGER, SELLER).
- [ ] **1.2 TDD: Services de Auth**
  - `RegisterService` (Argon2id).
  - `AuthService` (JWT com Claims de Role/Team).
- [ ] **1.3 🛡️ Middleware de Controle de Acesso (RBAC)**
  - Hooks `verifyRole` e `verifyTeam`.
- [ ] 💾 **COMMIT:** `feat: auth ecosystem with rbac`
- [ ] 🏷️ **TAG:** `git tag -a v0.2.0 -m "Milestone 1: Auth & Hierarchy"`

---

## 🚩 Milestone 2: Gestão de Contatos, Auditoria e UX Premium

**Objetivo:** CRUD robusto com rastreabilidade total e busca rápida.

- [ ] **2.1 📐 Modelagem de Auditoria (Audit Logs)**
  - Schema Prisma: `AuditLog`.
- [ ] **2.2 Backend: CRUD com Auditoria (TDD)**
  - `CreateContact` e `UpdateContact` gerando logs automáticos.
  - Isolamento de dados por Tenant/Role.
- [ ] **2.3 Frontend: Command Palette (cmdk)**
  - Componente `CmdkDialog` (Ctrl+K).
  - Busca Global otimizada.
- [ ] **2.4 Frontend: Data Grid**
  - TanStack Table Server-side.
- [ ] 💾 **COMMIT:** `feat: contacts crud with audit logs and command palette`
- [ ] 🏷️ **TAG:** `git tag -a v0.3.0 -m "Milestone 2: Contacts & UX"`

---

## 🚩 Milestone 3: Pipeline Real-Time & Gestão de Arquivos (Storage)

**Objetivo:** Colaboração síncrona e Anexos de Contratos.

- [ ] **3.1 📐 Storage Architecture (Presigned URLs)**
  - Configurar `@aws-sdk/client-s3` apontando para MinIO (Dev) ou AWS (Prod).
  - TDD `GenerateUploadUrlService`: Cria URL temporária (PUT) para o frontend enviar o arquivo.
- [ ] **3.2 Backend: Pipeline Transactional**
  - `MoveDealService`: Transação ACID (Update Deal + Audit Log + Socket Event).
- [ ] **3.3 Frontend: Kanban & Upload**
  - Dnd-kit + Optimistic UI.
  - **File Upload:** Componente Drag-and-Drop no Card do Deal. Envia direto para a URL assinada (S3/MinIO).
  - Lista de Arquivos anexados ao Deal.
- [ ] 💾 **COMMIT:** `feat: kanban with s3 file uploads`
- [ ] 🏷️ **TAG:** `git tag -a v0.4.0 -m "Milestone 3: Pipeline & Storage"`

---

## 🚩 Milestone 4: Gestão de Equipes & Processamento Assíncrono

**Objetivo:** Infraestrutura de Filas para tarefas pesadas.

- [ ] **4.1 📐 Infraestrutura de Workers (BullMQ)**
  - Criar fila `mail-queue` e Worker processador.
- [ ] **4.2 Backend: Team Management (TDD)**
  - `InviteMemberService`: Dispara job `send-invite-email`.
  - API responde em <50ms, Worker envia email em background.
- [ ] **4.3 Frontend: Gestão de Time**
  - Painel do Gerente.
- [ ] 💾 **COMMIT:** `feat: team management with background jobs`
- [ ] 🏷️ **TAG:** `git tag -a v0.4.5 -m "Milestone 4: Async Teams"`

---

## 🚩 Milestone 5: Dashboard Estratégico & Analytics

**Objetivo:** Visualização de dados agregados.

- [ ] **5.1 Backend: Agregações**
  - `DashboardService`: Prisma Aggregate (`sum`, `count`, `groupBy`).
- [ ] **5.2 Frontend: Gráficos**
  - Recharts (Funil, Receita).
- [ ] 🏷️ **TAG:** `git tag -a v0.5.0 -m "Milestone 5: Dashboard"`

---

## 🚩 Milestone 6: Auditoria de Segurança & Hardening

**Objetivo:** Blindagem pré-deploy.

- [ ] **6.1 🛡️ Validação de Arquivos (Storage Security)**
  - Garantir que apenas arquivos permitidos (PDF, PNG) gerem URLs assinadas.
  - Limitar tamanho do arquivo (Max 5MB).
- [ ] **6.2 🛡️ Auditoria RBAC & IDOR**
  - Pentest automatizado nas rotas.
- [ ] **6.3 🛡️ Supply Chain**
  - `npm audit`, `trivy image`.
- [ ] 🏷️ **TAG:** `git tag -a v0.6.0 -m "Milestone 6: Security Hardening"`

---

## 🚩 Milestone 7: Orquestração Kubernetes Multi-Ambiente

**Objetivo:** Deploy profissional.

- [ ] **7.1 Manifestos K8s**
  - `deployment-api.yaml`.
  - `deployment-worker.yaml`.
  - `statefulset-minio.yaml` (Para ambiente de Staging, ou ExternalName para S3 em Prod).
- [ ] **7.2 Secrets Management**
  - Configurar credenciais AWS/MinIO via K8s Secrets.
- [ ] 💾 **COMMIT:** `ops: k8s manifests including worker and storage`
- [ ] 🏷️ **TAG:** `git tag -a v0.7.0 -m "Milestone 7: Kubernetes Orchestration"`

---

## 🚩 Milestone 8: CI/CD & Observabilidade

**Objetivo:** Automação Final.

- [ ] **8.1 Pipeline CI/CD**
  - Build de imagens Docker (API e Worker).
- [ ] **8.2 Observabilidade**
  - Monitoramento de filas Redis.
- [ ] 🏷️ **TAG:** `git tag -a v1.0.0 -m "Release 1.0: Enterprise Gold"`

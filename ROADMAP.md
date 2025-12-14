# 🗺️ Roadmap: Orbit CRM (NestJS Enterprise Edition)

> **Visão do Projeto:** Uma plataforma de CRM com arquitetura de **Monólito Modular** baseada em **NestJS**, simulando um ambiente corporativo real. O sistema utiliza **Segurança Ofensiva**, **Processamento Assíncrono**, **Colaboração em Tempo Real** e **Type-Safety Ponta a Ponta**.

**Estratégia de Versionamento:**

- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ops:`.
- **Atomicidade:** Commits pequenos que contam a história da construção passo a passo.

---

## 💎 Pilares Técnicos & Parâmetros de Mercado

1.  **Arquitetura NestJS (Opinionated):** Uso estrito de Módulos, Controllers, Services e Injeção de Dependência (DI).
2.  **Type-Safety Ponta a Ponta:** O Frontend usa um **SDK gerado automaticamente** a partir do Swagger do Backend.
3.  **Storage Seguro:** Uploads via **Presigned URLs** diretas para S3/MinIO.
4.  **Assincronicidade:** Workers dedicados (BullMQ) para tarefas pesadas.
5.  **Qualidade Assegurada (QA):** TDD com Vitest e E2E com Playwright.

---

## 🛠️ Tech Stack "State-of-the-Art" (Dezembro 2025)

| Camada        | Tecnologia     | Versão       | Justificativa de Mercado             |
| :------------ | :------------- | :----------- | :----------------------------------- |
| **Runtime**   | **Node.js**    | **v24.12.0** | Estabilidade LTS.                    |
| **Framework** | **NestJS**     | **v11.0**    | Padrão Enterprise.                   |
| **Adapter**   | **Fastify**    | **v5.x**     | Performance HTTP.                    |
| **Database**  | **PostgreSQL** | **v17.2**    | ACID Compliance.                     |
| **ORM**       | **Prisma**     | **v6.16.0**  | Type-safety.                         |
| **Frontend**  | **React**      | **v19.2**    | React Compiler.                      |
| **SDK Gen**   | **Hey API**    | **Latest**   | Geração de Client Fetch via Swagger. |
| **Async**     | **BullMQ**     | **v5.12**    | Filas Redis.                         |
| **Tests**     | **Playwright** | **Latest**   | E2E Tests.                           |

---

## 🚩 Milestone 0: Fundação, Arquitetura e Ambiente Seguro

**Objetivo:** Base sólida com estrutura Modular do NestJS e Tooling.

- [x] **0.1 Setup do Monorepo (Workspaces)**
  - Inicializar Git.
  - Criar `package.json` raiz com workspaces: `["server", "web"]`.
  - Criar pasta `/server` (`nest new server`).
  - Criar pasta `/web` (`npm create vite@latest web`).
- [x] 💾 **COMMIT:** `chore: init monorepo structure with npm workspaces`
- [x] **0.2 Tooling & Linting**
  - Configurar ESLint 9 (Flat Config) na raiz.
  - Configurar Prettier e `.editorconfig`.
  - Configurar Husky e Commitlint.
- [x] 💾 **COMMIT:** `chore: configure strict eslint, prettier and husky`
- [x] **0.2.1 📊 Diagrama de Casos de Uso**
  - Mapear funcionalidades principais (Auth, Contacts, Pipeline, Teams).
  - Definir atores (Admin, Manager, Seller).
  - Criar diagrama UML (PlantUML ou Mermaid).
- [x] 💾 **COMMIT:** `docs: add use case diagram`
- [ ] **0.3 🛡️ Hardening & Config**
  - Configurar `ConfigModule` com validação **Zod**.
  - Configurar `FastifyAdapter` e `helmet`.
  - **Global Filter:** Criar `AllExceptionsFilter` para padronizar erros JSON (RFC 7807).
- [ ] 💾 **COMMIT:** `feat: setup security headers and global error handling`
- [ ] **0.4 Dockerização (Infra Local)**
  - Criar `docker-compose.yml`: Postgres, Redis, MinIO.
- [ ] 💾 **COMMIT:** `ops: add docker-compose for local development`
- [ ] **0.5 📊 Logging (Observabilidade)**
  - Instalar **Pino** (`npm i pino pino-http pino-pretty nestjs-pino`).
  - Criar `LoggerModule` e `LoggerService` customizado:
    - Configurar níveis de log por ambiente (dev: debug, prod: info).
    - Habilitar pretty-print em desenvolvimento.
    - Logs estruturados em JSON para produção.
  - Implementar `LoggingInterceptor` global:
    - Logar todas as requisições HTTP (método, URL, status, duração).
    - Adicionar `correlationId` (UUID) em cada request para rastreamento.
    - Capturar IP do cliente e User-Agent.
  - Integrar com `AllExceptionsFilter`:
    - Logar stack trace completo de erros.
    - Incluir contexto da requisição (IP, método, rota, headers).
  - Adicionar logs contextuais em pontos críticos:
    - Início/fim de operações do sistema.
    - Performance de queries lentas (threshold: >500ms).
    - Nota: Logs de autenticação e contexto de usuário serão adicionados no Milestone 1.
- [ ] 💾 **COMMIT:** `feat: implement structured logging with pino`
- [ ] **0.6 Hello World TDD**
  - Configurar **Vitest** no NestJS.
  - Teste do `AppController` (Health Check).
- [ ] 💾 **COMMIT:** `test: configure vitest and add health check test`
- [ ] 🏷️ **TAG:** `git tag -a v0.1.0 -m "Milestone 0: NestJS Foundation"`

---

## 🚩 Milestone 1: Identidade, Hierarquia e SDK Automation

**Objetivo:** Auth segura e integração Front-Back automatizada.

- [ ] **1.1 � Diagrama de Classes (Domínio Core)**
  - Modelar entidades: `User`, `Team`, `Role`, relacionamentos.
  - Definir atributos e multiplicidades.
  - Criar diagrama UML (PlantUML ou Mermaid).
- [ ] 💾 **COMMIT:** `docs: add core domain class diagram`
- [ ] **1.2 �📐 Modelagem de Domínio (Prisma)**
  - Schema: `User`, `Team`, `Role`.
  - Migration Dev.
- [ ] 💾 **COMMIT:** `feat: add user, team and role prisma schema`
- [ ] **1.3 TDD: Auth Service (Lógica)**
  - `AuthService`: Register com Argon2.
  - `JwtStrategy`: Passport JWT.
- [ ] 💾 **COMMIT:** `feat: implement secure auth logic with argon2`
- [ ] **1.4 🛡️ Guards (RBAC)**
  - Decorator `@Roles()`.
  - `RolesGuard` e `TeamsGuard`.
- [ ] 💾 **COMMIT:** `feat: add rbac guards`
- [ ] **1.5 📚 Docs & SDK Generation**
  - Configurar Swagger no Backend.
  - Configurar `@hey-api/openapi-ts` no Frontend.
  - Script `npm run generate:sdk` que lê o Swagger e cria o cliente TypeScript.
- [ ] 💾 **COMMIT:** `chore: setup automated sdk generation from swagger`
- [ ] 🏷️ **TAG:** `git tag -a v0.2.0 -m "Milestone 1: Auth & SDK"`

---

## 🚩 Milestone 2: Gestão de Contatos, Seeding e UX

**Objetivo:** CRUD, Dados Fakes e Interface.

- [ ] **2.1 � Atualizar Diagrama de Classes**
  - Adicionar entidade `Contact` e `AuditLog`.
  - Atualizar relacionamentos com `Team` e `User`.
- [ ] 💾 **COMMIT:** `docs: update class diagram with contacts module`
- [ ] **2.2 📐 Modelagem de Auditoria (Prisma)**
  - Adicionar schema `AuditLog` no Prisma.
  - Campos: `id`, `userId`, `action`, `entity`, `entityId`, `changes`, `timestamp`, `ip`.
  - Migration Dev.
- [ ] 💾 **COMMIT:** `feat: add audit log schema`
- [ ] **2.3 📐 Auditoria (AOP)**
  - `AuditInterceptor` para logar mutações no `AuditLog`.
  - Capturar contexto do usuário autenticado (disponível após Milestone 1).
- [ ] 💾 **COMMIT:** `feat: implement audit log interceptor`
- [ ] **2.4 Backend: Contacts Module (TDD)**
  - CRUD com isolamento por Time.
  - **Database Seeding:** Criar script `prisma/seed.ts` (Faker.js) para popular banco.
- [ ] 💾 **COMMIT:** `feat: contacts crud and database seeder`
- [ ] **2.5 Frontend: Setup & Navigation**
  - Shadcn/UI, Tailwind v4.
  - Componente `CmdkDialog` (Command Palette).
  - Integrar API usando o SDK gerado.
- [ ] 💾 **COMMIT:** `feat(web): setup ui and command palette navigation`
- [ ] **2.6 Frontend: Data Grid**
  - Tabela de Contatos Server-side.
- [ ] 💾 **COMMIT:** `feat(web): contacts data grid`
- [ ] 🏷️ **TAG:** `git tag -a v0.3.0 -m "Milestone 2: Contacts & UX"`

---

## 🚩 Milestone 3: Pipeline Real-Time & Storage

**Objetivo:** Colaboração síncrona e Uploads.

- [ ] **3.1 � Atualizar Diagrama de Classes**
  - Adicionar entidades `Deal`, `Pipeline`, `Attachment`.
  - Mapear relacionamentos com `Contact` e `Storage`.
- [ ] 💾 **COMMIT:** `docs: update class diagram with pipeline module`
- [ ] **3.2 �📐 Storage Module**
  - Presigned URLs para S3/MinIO.
  - Validação de segurança (MIME/Size).
- [ ] 💾 **COMMIT:** `feat: secure storage module`
- [ ] **3.3 Backend: WebSockets**
  - `EventsGateway` (Socket.io).
  - Evento `deal.moved`.
- [ ] 💾 **COMMIT:** `feat: websocket gateway`
- [ ] **3.4 Frontend: Kanban & Upload**
  - `dnd-kit` + Optimistic Updates.
  - Upload direto para S3.
- [ ] 💾 **COMMIT:** `feat(web): kanban board with sync and uploads`
- [ ] 🏷️ **TAG:** `git tag -a v0.4.0 -m "Milestone 3: Pipeline & Storage"`

---

## 🚩 Milestone 4: Processamento Assíncrono (Workers)

**Objetivo:** Filas para tarefas pesadas.

- [ ] **4.1 📐 BullMQ Setup**
  - Fila `mail-queue`.
- [ ] 💾 **COMMIT:** `chore: setup bullmq`
- [ ] **4.2 Workers & Invites**
  - `MailProcessor` (Worker).
  - `InviteMemberService` (Producer).
- [ ] 💾 **COMMIT:** `feat: mail processor and invite logic`
- [ ] **4.3 Frontend: Team UI**
  - Modal de convite de membros.
- [ ] 💾 **COMMIT:** `feat(web): team management ui`
- [ ] 🏷️ **TAG:** `git tag -a v0.4.5 -m "Milestone 4: Async Teams"`

---

## 🚩 Milestone 5: Analytics & Testes E2E

**Objetivo:** Qualidade final e Dashboards.

- [ ] **5.1 Backend: Dashboard**
  - Agregações com Prisma (Group By).
- [ ] 💾 **COMMIT:** `feat: dashboard aggregations`
- [ ] **5.2 Frontend: Charts**
  - Recharts.
- [ ] 💾 **COMMIT:** `feat(web): analytics dashboard`
- [ ] **5.3 🧪 Testes E2E (Playwright)**
  - `auth.spec.ts` (Login).
  - `crm.spec.ts` (Fluxo completo).
- [ ] 💾 **COMMIT:** `test: playwright e2e scenarios`
- [ ] 🏷️ **TAG:** `git tag -a v0.5.0 -m "Milestone 5: Dashboard & QA"`

---

## 🚩 Milestone 6: Security Hardening (Blindagem)

**Objetivo:** Auditoria e Proteção.

- [ ] **6.1 🛡️ Security Gates**
  - Implementar `ThrottlerModule` (Rate Limiting).
  - Configurar CORS restrito (Whitelist).
- [ ] **6.2 🛡️ Pentest Simulado (TDD)**
  - Criar teste que tenta acessar rota de Admin com token de Vendedor.
  - Criar teste que tenta Upload de arquivo malicioso.
- [ ] **6.3 🛡️ Supply Chain**
  - Rodar `npm audit` e corrigir vulnerabilidades.
- [ ] 💾 **COMMIT:** `chore: apply security hardening`
- [ ] 🏷️ **TAG:** `git tag -a v0.6.0 -m "Milestone 6: Security Hardening"`

---

## 🚩 Milestone 7: Orquestração Kubernetes Multi-Ambiente

**Objetivo:** Deploy profissional com separação de cargas.

- [ ] **7.1 Arquitetura de Processos (NestJS Standalone)**
  - Criar entrypoint separado `src/worker.ts` (apenas carrega o módulo de filas, sem servidor HTTP).
- [ ] **7.2 Manifestos K8s (Workloads)**
  - `k8s/deployment-api.yaml`: Réplicas > 1.
  - `k8s/deployment-worker.yaml`: Consumidor de filas dedicado.
  - `k8s/statefulset-minio.yaml`: Storage para Staging.
  - `k8s/service.yaml` e `k8s/ingress.yaml`.
- [ ] 💾 **COMMIT:** `ops: add k8s manifests with api and worker separation`
- [ ] 🏷️ **TAG:** `git tag -a v0.7.0 -m "Milestone 7: Kubernetes Orchestration"`

---

## 🚩 Milestone 8: CI/CD & Observabilidade

**Objetivo:** Automação Final e Monitoramento.

- [ ] **8.1 Pipeline CI/CD (GitHub Actions)**
  - Workflow `.github/workflows/ci.yml`.
  - Jobs: Install -> Lint -> Test (Unit) -> E2E (Playwright Headless) -> Build Docker.
- [ ] **8.2 Docker Builds Otimizados**
  - Ajustar `Dockerfile` para Multi-stage build (Target: API vs Worker).
- [ ] **8.3 Observabilidade Básica**
  - Endpoint `/health` retornando status do Redis e DB.
- [ ] 💾 **COMMIT:** `ci: setup github actions pipeline`
- [ ] 🏷️ **TAG:** `git tag -a v1.0.0 -m "Release 1.0: Enterprise Gold"`

# 🗺️ Roadmap: Orbit CRM (NestJS Enterprise Edition)

> **Visão do Projeto:** Uma plataforma de CRM com arquitetura de **Monólito Modular** baseada em **NestJS**, simulando um ambiente corporativo real. O sistema utiliza **Segurança Ofensiva**, **Processamento Assíncrono** e **Gestão de Arquivos em Nuvem**.

---

## 💎 Pilares Técnicos & Parâmetros de Mercado

1.  **Arquitetura NestJS (Opinionated):** Uso estrito de Módulos, Controllers, Services e Injeção de Dependência (DI) para garantir escalabilidade e testabilidade.
2.  **Storage Seguro & Performático:** Uploads de arquivos (Contratos/Propostas) usando **Presigned URLs**. O backend apenas autoriza, o frontend envia direto para o Object Storage (S3/MinIO).
3.  **Assincronicidade (Background Jobs):** Emails e tarefas pesadas são processados por Workers (BullMQ + Redis), garantindo que a API principal permaneça rápida.
4.  **Rastreabilidade (Audit Logs via Interceptors):** Cada alteração de dado gera um rastro imutável ("Quem, Quando, Onde") interceptado automaticamente.
5.  **Qualidade Assegurada (QA):** Cobertura de testes unitários (Vitest) e testes de ponta a ponta (Playwright) para fluxos críticos.

---

## 🛠️ Tech Stack "State-of-the-Art" (Dezembro 2025)

| Camada        | Tecnologia              | Versão              | Justificativa de Mercado                              |
| :------------ | :---------------------- | :------------------ | :---------------------------------------------------- |
| **Runtime**   | Node.js                 | **v24.12.0**        | Estabilidade LTS.                                     |
| **Framework** | **NestJS**              | **v11.0**           | Padrão Enterprise para Node.js (Modular/DI).          |
| **Database**  | PostgreSQL              | **v17.2**           | ACID Compliance.                                      |
| **ORM**       | Prisma                  | **v6.16.0**         | Type-safety e produtividade.                          |
| **Frontend**  | React                   | **v19.2**           | React Compiler e Server Actions.                      |
| **State**     | **Zustand**             | **v5.0**            | Gerenciamento de estado leve e simples (Client-side). |
| **Async**     | BullMQ                  | **v5.12**           | Filas robustas sobre Redis (via `@nestjs/bull`).      |
| **Docs**      | **Swagger**             | **@nestjs/swagger** | Geração automática de OpenAPI via Decorators.         |
| **Tests**     | Vitest & **Playwright** | **Latest**          | A suíte de testes E2E mais rápida e confiável.        |
| **Infra**     | Kubernetes              | **v1.31+**          | Orquestração padrão Enterprise.                       |

---

## 🚩 Milestone 0: Fundação, Arquitetura e Ambiente Seguro

**Objetivo:** Base sólida com estrutura Modular do NestJS.

- [ ] **0.1 Setup do Monorepo**
  - Estrutura `/server` (NestJS App), `/web` (React + Vite), `/k8s`, `/docs`.
- [ ] **0.2 Tooling & Quality Gates**
  - ESLint 9, Prettier, Husky.
- [ ] **0.3 🛡️ Hardening & Env Validation**
  - Configurar `ConfigModule` do NestJS com validação **Zod**.
  - Configurar `helmet` (Security Headers) no `main.ts`.
- [ ] **0.4 Dockerização (Infra Local)**
  - `docker-compose.yml`: Postgres, Redis, MinIO.
- [ ] **0.5 Hello World TDD**
  - Configurar **Vitest** no NestJS (substituindo Jest padrão para mais velocidade).
  - Teste do `AppController`.
- [ ] 🏷️ **TAG:** `git tag -a v0.1.0 -m "Milestone 0: NestJS Foundation"`

---

## 🚩 Milestone 1: Identidade, Hierarquia e Acesso (Auth + RBAC)

**Objetivo:** Autenticação segura usando Guards e Decorators.

- [ ] **1.1 📐 Modelagem de Domínio (Modules)**
  - Criar `AuthModule`, `UsersModule`, `TeamsModule`.
  - Schema Prisma: `User`, `Team`, `Role` (MANAGER, SELLER).
- [ ] **1.2 TDD: Services de Auth**
  - `AuthService`: Login/Register com Argon2id.
  - `JwtStrategy`: Configurar Passport JWT.
- [ ] **1.3 🛡️ Guards & Decorators (RBAC)**
  - Criar `@Roles()` decorator.
  - Criar `RolesGuard` e `TeamsGuard` para proteger rotas.
- [ ] **1.4 📚 Documentação Viva**
  - Configurar `@nestjs/swagger` no `main.ts`.
  - Decorar DTOs com `@ApiProperty()` para gerar docs automáticas.
- [ ] 💾 **COMMIT:** `feat: auth module with guards and swagger`
- [ ] 🏷️ **TAG:** `git tag -a v0.2.0 -m "Milestone 1: Auth & Hierarchy"`

---

## 🚩 Milestone 2: Gestão de Contatos, Auditoria e UX Premium

**Objetivo:** CRUD robusto com rastreabilidade via Interceptors.

- [ ] **2.1 📐 Auditoria (AOP)**
  - Criar `AuditInterceptor`: Intercepta mutações (POST/PUT/DELETE) e salva logs no banco automaticamente.
- [ ] **2.2 Backend: CRUD com Auditoria (TDD)**
  - `ContactsModule`.
  - Uso de DTOs com `ZodValidationPipe` para validar entradas.
- [ ] **2.3 Frontend: Command Palette & Zustand**
  - Configurar **Zustand Store** (`useUIStore`) para controlar modais e sidebar.
  - Componente `CmdkDialog` (Ctrl+K).
- [ ] **2.4 Frontend: Data Grid**
  - TanStack Table integrado com API.
- [ ] 💾 **COMMIT:** `feat: contacts module with audit interceptor`
- [ ] 🏷️ **TAG:** `git tag -a v0.3.0 -m "Milestone 2: Contacts & UX"`

---

## 🚩 Milestone 3: Pipeline Real-Time & Gestão de Arquivos

**Objetivo:** Colaboração síncrona e Anexos.

- [ ] **3.1 📐 Storage (Presigned URLs)**
  - `StorageModule`.
  - Serviço para gerar URLs de upload (MinIO/S3).
- [ ] **3.2 Backend: Pipeline Real-Time**
  - `EventsModule` com `EventsGateway` (`@WebSocketGateway`).
  - Emitir eventos via Socket.io ao atualizar Deals.
- [ ] **3.3 Frontend: Kanban**
  - Dnd-kit + Optimistic UI.
  - Upload de arquivos direto para Storage.
- [ ] 💾 **COMMIT:** `feat: kanban with websockets and s3`
- [ ] 🏷️ **TAG:** `git tag -a v0.4.0 -m "Milestone 3: Pipeline & Storage"`

---

## 🚩 Milestone 4: Gestão de Equipes & Processamento Assíncrono

**Objetivo:** Infraestrutura de Filas com NestJS Bull.

- [ ] **4.1 📐 Workers (BullMQ)**
  - Configurar `BullModule.forRoot()`.
  - Criar `MailProcessor` (`@Processor('mail')`) para enviar emails.
- [ ] **4.2 Backend: Team Management**
  - `InviteMemberService`: Adiciona job na fila.
- [ ] 💾 **COMMIT:** `feat: team management with bull queues`
- [ ] 🏷️ **TAG:** `git tag -a v0.4.5 -m "Milestone 4: Async Teams"`

---

## 🚩 Milestone 5: Dashboard & Testes E2E

**Objetivo:** Analytics e Garantia de Qualidade.

- [ ] **5.1 Backend: Agregações**
  - `DashboardModule`.
- [ ] **5.2 Frontend: Gráficos**
  - Recharts.
- [ ] **5.3 🧪 Testes E2E (Playwright)**
  - Instalar e configurar **Playwright**.
  - Criar spec: `tests/e2e/auth-flow.spec.ts` (Login -> Dashboard).
  - Criar spec: `tests/e2e/crm-flow.spec.ts` (Criar Lead -> Mover no Kanban).
- [ ] 💾 **COMMIT:** `test: e2e scenarios with playwright`
- [ ] 🏷️ **TAG:** `git tag -a v0.5.0 -m "Milestone 5: Dashboard & QA"`

---

## 🚩 Milestone 6: Auditoria de Segurança & Hardening

**Objetivo:** Blindagem pré-deploy.

- [ ] **6.1 🛡️ Security Audit**
  - Configurar `ThrottlerModule` (Rate Limiting) globalmente.
  - Validar Uploads e Permissões.
- [ ] **6.2 🛡️ Supply Chain**
  - `npm audit`.
- [ ] 🏷️ **TAG:** `git tag -a v0.6.0 -m "Milestone 6: Security Hardening"`

---

## 🚩 Milestone 7: Orquestração Kubernetes Multi-Ambiente

**Objetivo:** Deploy profissional.

- [ ] **7.1 Arquitetura de Processos**
  - NestJS Standalone App para Workers vs HTTP App.
- [ ] **7.2 Manifestos K8s**
  - Deployments, Services, Secrets.
- [ ] 🏷️ **TAG:** `git tag -a v0.7.0 -m "Milestone 7: Kubernetes Orchestration"`

---

## 🚩 Milestone 8: CI/CD & Observabilidade

**Objetivo:** Automação Final.

- [ ] **8.1 Pipeline CI/CD**
  - Build Docker.
  - Execução dos testes Playwright no CI (Headless).
- [ ] **8.2 Observabilidade**
  - Monitoramento Redis.
- [ ] 🏷️ **TAG:** `git tag -a v1.0.0 -m "Release 1.0: Enterprise Gold"`

<div align="center">

<!-- PROJECT_TITLE_START -->

🪐 Orbit CRM

<!-- PROJECT_TITLE_END -->

<!-- PROJECT_TECH_START -->

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)

<!-- PROJECT_TECH_END -->

<!-- PROJECT_DEMO_START -->

https://github.com/luiznascimentodev/mvp-crm

<!-- PROJECT_DEMO_END -->

</div>

---

## 🌟 Visão Geral do Projeto

**Orbit CRM** é uma plataforma de CRM com arquitetura de **Monólito Modular** baseada em **NestJS**, simulando um ambiente corporativo real. Este projeto, atualmente em fase de desenvolvimento acelerado, visa estabelecer um novo padrão para aplicações corporativas no meu portfólio. Trata-se de um CRM (Customer Relationship Management) "Full-Cycle" projetado para simular cenários reais de alta complexidade, incluindo colaboração em tempo real via WebSockets, processamento assíncrono de tarefas pesadas com workers dedicados e uma arquitetura modular com Injeção de Dependência (DI). O foco principal não é apenas a funcionalidade, mas a excelência na engenharia: TDD (Test Driven Development) estrito, segurança ofensiva (OWASP Top 10) e orquestração de infraestrutura com Kubernetes.

<!-- PROJECT_HIGHLIGHTS_START -->

- 🚧 **Status**: Em construção (Fase: Arquitetura & Setup)
- ✅ **Security First**: Auditoria de logs, RBAC granular e proteção contra injeção
- ✅ **Performance**: Arquitetura híbrida (Síncrona para API / Assíncrona para Jobs)
- ✅ **Escalabilidade**: Preparado para Kubernetes com separação de ambientes
- ✅ **UX Moderna**: Navegação "Keyboard-first" (Command Palette) e Optimistic UI
<!-- PROJECT_HIGHLIGHTS_END -->

## ✨ Funcionalidades Planejadas

O sistema está sendo construído módulo a módulo, seguindo uma estratégia de "Vertical Slices":

- **Pipeline de Vendas Real-Time**: Kanban colaborativo onde as movimentações são sincronizadas via WebSockets entre todos os membros da equipe instantaneamente.
- **Gestão de Acesso (RBAC)**: Hierarquia estrita onde Gerentes possuem visão analítica global e Vendedores possuem acesso isolado (Multi-tenancy lógico).
- **Auditoria Total (Audit Logs)**: Rastreabilidade imutável de "Quem, Quando e Onde" para qualquer alteração crítica de dados.
- **Processamento Assíncrono**: Sistema de filas (BullMQ + Redis) para envio de emails e geração de relatórios sem bloquear a API.
- **Gestão de Arquivos**: Upload seguro de contratos e propostas diretamente para Object Storage (S3/MinIO) via Presigned URLs.
- **Dashboard Estratégico**: Métricas de conversão e receita calculadas com agregações de alta performance no banco de dados.

---

## 🛠️ Stack Tecnológica

A escolha das tecnologias reflete o "Estado da Arte" do desenvolvimento web em 2025:
Dezembro 2025:

### Backend (API & Workers)

- **Runtime**: Node.js v24.12.0 (LTS)
- **Framework**: NestJS v11.0 (Arquitetura Modular com DI)
- **Linguagem**: TypeScript v5.9 (Strict Mode)
- **Database**: PostgreSQL v17.2 + Prisma ORM v6.16.0
- **Async/Queues**: BullMQ v5.12 + Redis 7 (via `@nestjs/bull`)
- **Real-time**: Socket.io via `@nestjs/websockets` com Guards JWT
- **Documentação**: Swagger (@nestjs/swagger) com OpenAPI
- **Testes**: Vitest (Unitários) + Playwright (E2E)

### Frontend (SPA)

- **Core**: React v19.2 + Vite
- **Estilização**: Tailwind CSS v4 + Shadcn/UI
- **State Management**: Zustand v5.0 (Client-side)
- **UX**: cmdk (Command Palette), Sonner (Toasts), Dnd-kit (Kanban)
- **Data Fetching**: TanStack Table para grids

### Infraestrutura & DevOps

- **Containerização**: Docker & Docker Compose (Multi-stage builds)
- **Orquestração**: Kubernetes v1.31+ (Namespaces para Staging/Prod)
- **CI/CD**: GitHub Actions (Lint, Test E2E, Security Scan, Build)
- **Storage**: MinIO (Local) / AWS S3 (Prod) com Presigned URLs

---

## 📁 Estrutura do Monorepo

O projeto segue uma estrutura de monorepo modular para organização clara entre API, Workers e Frontend:

```bash
mvp-crm/
 server/              # NestJS Backend (API + Workers)
    src/
       main.ts      # Entrypoint HTTP (Fastify)
       worker.ts    # Entrypoint Workers (BullMQ)
       auth/        # Módulo de Autenticação
       contacts/    # Módulo de Contatos
       teams/       # Módulo de Times
       storage/     # Módulo de Upload (S3/MinIO)
       common/      # Guards, Interceptors, Filters
    prisma/
       schema.prisma
       seed.ts      # Dados fakes (Faker.js)
    test/            # Testes E2E (Playwright)
 web/                 # React SPA (Frontend)
    src/
       components/  # Componentes UI (Shadcn/UI)
       lib/         # SDK gerado automaticamente
       pages/       # Rotas da aplicação
    vite.config.ts
 k8s/                 # Manifestos Kubernetes
    deployment-api.yaml
    deployment-worker.yaml
    ingress.yaml
 docker-compose.yml   # Infra local (Postgres, Redis, MinIO)
 package.json         # Workspaces raiz
```

---

## Diferenciais Técnicos

Este projeto não é apenas mais um CRUD. Aqui estão os aspectos que o tornam único:

### 1. **Type-Safety Ponta a Ponta**

O frontend consome um **SDK TypeScript gerado automaticamente** a partir do Swagger do backend. Isso elimina erros de integração e garante que qualquer mudança na API seja refletida no cliente.

```bash
# No backend: gera swagger.json
npm run build:swagger

# No frontend: gera client TypeScript
npm run generate:sdk
```

### 2. **Arquitetura de Monólito Modular (NestJS Opinionated)**

- **Injeção de Dependência (DI)** estrita em todos os módulos
- **Separation of Concerns**: Cada módulo é autônomo (Controllers, Services, Repositories)
- **Guards & Interceptors**: RBAC aplicado em nível de rota com `@Roles()` decorator

### 3. **Segurança Ofensiva (Security First)**

- **Autenticação**: JWT com refresh tokens rotacionados
- **Hash de Senhas**: Argon2 (resistente a ataques GPU)
- **RBAC**: Controle de acesso baseado em Roles (`Admin`, `Manager`, `Seller`)
- **Rate Limiting**: Throttler configurado para prevenir DDoS
- **Validação de Uploads**: MIME-type checking e sanitização de nomes
- **Global Exception Filter**: Respostas padronizadas seguindo RFC 7807

### 4. **Performance & Escalabilidade**

- **Adapter HTTP**: Fastify (30% mais rápido que Express)
- **Workers Dedicados**: Processos separados para consumo de filas (k8s deployment-worker.yaml)
- **Object Storage**: Uploads diretos para S3/MinIO via Presigned URLs (zero tráfego no servidor)
- **Otimistic UI**: Interface responsiva com atualizações instantâneas (reconciliação posterior)

### 5. **Qualidade Assegurada (QA)**

- **TDD Estrito**: Todos os serviços críticos possuem testes unitários (Vitest)
- **E2E Coverage**: Cenários completos testados com Playwright headless
- **CI/CD**: Pipeline automatizado valida Lint, Tests e Build antes do deploy

---

## Roadmap de Desenvolvimento

O projeto está sendo construído em **milestones incrementais** para garantir entrega contínua de valor:

### Milestone 0: Fundação (Em Progresso)

- [x] Setup do monorepo com workspaces
- [x] Configuração de ESLint 9 (Flat Config) + Prettier
- [ ] Dockerização da infraestrutura (PostgreSQL, Redis, MinIO)
- [ ] Configuração do Fastify + Helmet
- [ ] Testes de Health Check com Vitest

### Milestone 1: Autenticação & SDK

- [ ] Schema Prisma: `User`, `Team`, `Role`
- [ ] Auth Service com Argon2 + JWT Strategy
- [ ] Guards RBAC (`@Roles()`, `RolesGuard`)
- [ ] Swagger configurado
- [ ] SDK TypeScript gerado automaticamente

### Milestone 2: Gestão de Contatos

- [ ] CRUD de Contatos com isolamento por time
- [ ] Database Seeding com Faker.js
- [ ] Audit Interceptor (logs de mutações)
- [ ] Frontend: Shadcn/UI + Command Palette
- [ ] Data Grid com paginação server-side

### Milestone 3: Pipeline Real-Time

- [ ] Presigned URLs para upload seguro (S3/MinIO)
- [ ] WebSocket Gateway (`EventsGateway`)
- [ ] Kanban Board com dnd-kit
- [ ] Sincronização em tempo real via Socket.io

### Milestone 4: Processamento Assíncrono

- [ ] BullMQ + Redis configurado
- [ ] Mail Processor (Worker dedicado)
- [ ] Sistema de convites de membros
- [ ] UI de gerenciamento de times

### Milestone 5: Analytics & E2E

- [ ] Dashboard com agregações (Prisma Group By)
- [ ] Charts com Recharts
- [ ] Testes E2E completos (Playwright)

### Milestone 6: Security Hardening

- [ ] Rate Limiting (ThrottlerModule)
- [ ] CORS restrito (Whitelist)
- [ ] Pentest simulado (TDD de segurança)
- [ ] Auditoria de dependências (`npm audit`)

### Milestone 7: Kubernetes Multi-Ambiente

- [ ] Worker standalone (`src/worker.ts`)
- [ ] Manifestos K8s (API + Worker separados)
- [ ] StatefulSet para MinIO
- [ ] Ingress configurado

### Milestone 8: CI/CD & Observabilidade

- [ ] GitHub Actions pipeline completo
- [ ] Docker multi-stage build (api vs worker)
- [ ] Health endpoint com status de dependências

---

## Objetivos de Aprendizado

Este projeto é uma jornada de evolução técnica contínua:

- Dominar arquitetura de Monólito Modular com NestJS
- Implementar segurança ofensiva (OWASP Top 10)
- Orquestrar aplicações escaláveis com Kubernetes
- Aplicar TDD em cenários reais complexos
- Construir sistemas real-time com WebSockets
- Gerenciar estado assíncrono com filas (BullMQ)

---

## Como Rodar Localmente (Em Breve)

> **Atenção**: O projeto ainda está em fase inicial de desenvolvimento. As instruções abaixo refletem o estado planejado.

### Pré-requisitos

- Node.js v24.12.0 (LTS)
- Docker & Docker Compose
- Git

### Instalação

```bash
# Clone o repositório
git clone https://github.com/luiznascimentodev/mvp-crm.git
cd mvp-crm

# Instale dependências do monorepo
npm install

# Suba a infraestrutura local
docker-compose up -d

# Execute migrations do Prisma
cd server
npx prisma migrate dev
npx prisma db seed

# Inicie o backend
npm run start:dev

# Em outro terminal, inicie o frontend
cd ../web
npm run dev
```

### Scripts Disponíveis

```bash
# Backend
npm run start:dev      # Inicia API em modo watch
npm run test           # Executa testes unitários (Vitest)
npm run test:e2e       # Executa testes E2E (Playwright)

# Frontend
npm run dev            # Inicia Vite dev server
npm run generate:sdk   # Gera SDK TypeScript do Swagger
npm run build          # Build de produção
```

---

## Estratégia de Versionamento

O projeto utiliza **Conventional Commits** para manter uma história clara de desenvolvimento:

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Atualização de documentação
- `chore:` Tarefas de manutenção
- `test:` Adição/atualização de testes
- `ops:` Configuração de infraestrutura

**Tags de Release**: Cada milestone concluído recebe uma tag git (`v0.1.0`, `v0.2.0`, etc.)

---

## Contribuições

Este é um projeto pessoal de portfólio em desenvolvimento ativo. Sugestões e feedbacks são sempre bem-vindos! Sinta-se livre para abrir issues ou pull requests.

---

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

## Autor

**Luiz Nascimento**  
 [LinkedIn](https://linkedin.com/in/luiznascimentodev)  
 [GitHub](https://github.com/luiznascimentodev)

---

<div align="center">

** Projeto em Construção Ativa - Acompanhe o progresso nas Issues e no [Roadmap](ROADMAP.md) **

</div>

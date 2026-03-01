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

**Orbit CRM** é uma plataforma de CRM com arquitetura de **Monólito Modular** baseada em **NestJS 11**, simulando um ambiente corporativo real. O sistema cobre o ciclo completo de prospecção: captura de leads via formulário público, gestão no funil Kanban visual com arrastar e soltar em tempo real, conversão de leads em contatos e gestão de equipe multi-tenant com convites por e-mail.

<!-- PROJECT_HIGHLIGHTS_START -->

- 🚀 **Status**: Em desenvolvimento ativo — core funcional rodando
- ✅ **Multi-tenant**: Isolamento total por `tenantId` com RBAC (`OWNER > ADMIN > MEMBER`)
- ✅ **Real-time**: Kanban sincronizado via WebSockets (Socket.io) entre todos os membros
- ✅ **Security First**: JWT + Argon2 + Guards + Audit Logs + Rate Limiting
- ✅ **UX Moderna**: Command Palette, Optimistic UI, Drag & Drop fluido, painel lateral deslizante
- ✅ **Qualidade**: Vitest (unitário + integração), cobertura de segurança multi-tenancy, CI via ESLint

<!-- PROJECT_HIGHLIGHTS_END -->

---

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação & RBAC
- Login com JWT (accessToken em memória/localStorage)
- Registro de usuários por workspace (`tenantId`)
- Hierarquia de permissões: `OWNER > ADMIN > MEMBER`
- Guards: `AuthGuard('jwt')` + `RolesGuard` + `LeadOwnershipGuard`

### 🎯 Pipeline de Prospecção (Leads)
- Funil Kanban visual com 7 etapas: `Novo → Contactado → Qualificado → Proposta → Negociação → Ganho / Perdido`
- Drag & Drop fluido com placeholder animado (`@hello-pangea/dnd`)
- Sincronização em tempo real via WebSocket — movimentações refletidas instantaneamente para toda a equipe
- Criação, edição e exclusão de leads com soft-delete
- Painel lateral deslizante com detalhes completos (estilo Pipedrive)
- **Captura pública**: endpoint `POST /leads/public/:tenantId` sem autenticação para formulários externos de captação
- Conversão de lead em contato (`POST /leads/:id/convert`)
- Filtragem por responsável, fonte e status; MEMBER vê apenas seus próprios leads

### 👥 Contatos
- CRUD completo com soft-delete
- Campos: nome, empresa, cargo, e-mail, telefone, website, cidade, estado, país, notas
- Scoping automático por tenant e por responsável (MEMBER)

### 📊 Dashboard Analítico
- KPIs em tempo real: total de contatos, leads ativos, taxa de conversão, leads ganhos
- Gráfico de linha: leads ao longo do tempo (7 / 30 / 90 dias)
- Funil de conversão em barras por etapa com cores dinâmicas
- Ranking de top vendedores por leads ganhos

### 👨‍👩‍👧 Gestão de Equipe
- Listagem de membros do workspace com papéis e status
- Envio de convites por e-mail via fila assíncrona (BullMQ + Redis)
- Aceitação de convite via link tokenizado (`/accept-invite/:token`)
- Alteração de papel de membros (ADMIN/OWNER)
- Remoção de membros

### 📁 Upload de Arquivos
- Geração de Presigned URLs diretas para MinIO / S3
- Upload sem proxy no servidor (zero carga na API)
- Validação de MIME type e tamanho máximo (10 MB)

### 🔔 Eventos em Tempo Real (WebSockets)
- Gateway Socket.io com autenticação JWT na conexão
- Salas isoladas por `tenantId`
- Eventos: `lead.move`, `lead.updated`, `lead.created`, `lead.deleted`

### 📋 Auditoria
- `AuditLog` registra toda mutação crítica: quem, quando, qual recurso e qual operação
- Imutável — nunca deletado em cascata

---

## 🛠️ Stack Tecnológica

### Backend
| Camada | Tecnologia |
|---|---|
| Runtime | Node.js v24 LTS |
| Framework | NestJS v11 + FastifyAdapter |
| Linguagem | TypeScript v5 (strict) |
| ORM / DB | Prisma v6 + PostgreSQL 17 |
| Autenticação | Passport.js + JWT + Argon2 |
| Filas | BullMQ v5 + Redis 7 |
| Real-time | Socket.io (`@nestjs/websockets`) |
| Validação | class-validator + class-transformer + Zod (env) |
| Testes | Vitest (unit + integration) |
| Docs | Swagger (`@nestjs/swagger`) |

### Frontend
| Camada | Tecnologia |
|---|---|
| Core | React v19 + Vite |
| Estilização | Tailwind CSS v4 + Shadcn/UI |
| Drag & Drop | @hello-pangea/dnd |
| State/Fetch | Zustand v5 + TanStack Query v5 |
| Forms | React Hook Form + Controller |
| Real-time | Socket.io-client (`useSocket` hook) |
| Notificações | Sonner (toasts) |
| Navegação | Command Palette (cmdk) |

### Infraestrutura
| Camada | Tecnologia |
|---|---|
| Containers | Docker + Docker Compose |
| Orquestração | Kubernetes (planejado) |
| Storage | MinIO local / AWS S3 prod |
| CI/CD | GitHub Actions (planejado) |

---

## 📁 Estrutura do Monorepo

```
mvp-crm/
├── server/                          # NestJS Backend
│   ├── src/
│   │   ├── auth/                    # JWT, Passport, registro, login
│   │   ├── leads/                   # Pipeline de prospecção + endpoint público
│   │   ├── contacts/                # Gestão de contatos convertidos
│   │   ├── dashboard/               # Métricas e analytics de leads
│   │   ├── team/                    # Membros, convites, papéis
│   │   ├── storage/                 # Presigned URLs (MinIO/S3)
│   │   ├── events/                  # WebSocket Gateway (Socket.io)
│   │   ├── queues/                  # BullMQ workers (e-mail de convite)
│   │   ├── admin/                   # Endpoints administrativos
│   │   └── common/                  # Guards, filters, interceptors, enums, env
│   ├── prisma/
│   │   ├── schema.prisma            # Tenant, User, Lead, Contact, Activity,
│   │   │                            # Attachment, TeamInvite, AuditLog
│   │   └── seed.ts                  # Dados fakes realistas para dev
│   └── src/test/                    # Helpers de integração, multi-tenancy spec
├── web/                             # React SPA
│   └── src/
│       ├── pages/
│       │   ├── login.tsx
│       │   ├── dashboard/           # KPIs + gráficos (Recharts)
│       │   ├── pipeline/            # Kanban de leads (@hello-pangea/dnd)
│       │   ├── contacts/            # CRUD de contatos
│       │   └── team/                # Membros + accept-invite
│       ├── hooks/use-socket.ts      # Socket.io hooks (lead events)
│       ├── components/
│       │   └── command-palette.tsx  # Ctrl+K global
│       └── stores/auth.store.ts     # Zustand — token + user
└── docker-compose.yml               # Postgres 5432, Redis 6379, MinIO 9000
```

---

## 🗄️ Modelo de Dados (Prisma)

```
Tenant ──┬── User (OWNER | ADMIN | MEMBER)
         ├── Lead (soft-delete, status: string, ownerId)
         ├── Contact (soft-delete, ownerId)
         ├── Activity (leadId? | contactId?)
         ├── Attachment
         ├── TeamInvite
         └── AuditLog
```

- PKs UUID, `tenantId` indexado em todos os modelos
- Timestamps em `@db.Timestamptz`
- `onDelete: Cascade` a partir de `Tenant`
- Lead e Contact usam **soft-delete** (`deletedAt: DateTime?`)

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js v20+ (v24 LTS recomendado)
- Docker & Docker Compose

### Instalação

```powershell
# Clone o repositório
git clone https://github.com/luiznascimentodev/mvp-crm.git
cd mvp-crm

# Instale dependências do monorepo
npm install

# Suba a infraestrutura (Postgres, Redis, MinIO)
docker-compose up -d

# Configure as variáveis de ambiente
cp server/.env.example server/.env  # edite JWT_SECRET, DATABASE_URL, etc.

# Execute migrations e popule com dados de teste
cd server
npx prisma migrate dev
npm run seed

# Terminal 1 — Backend (modo watch)
npm run start:dev

# Terminal 2 — Frontend
cd ../web
npm run dev
```

### Credenciais de Teste (seed)

| E-mail | Papel | Senha |
|---|---|---|
| `owner@orbitdemo.com` | OWNER | `Senha@123` |
| `admin@orbitdemo.com` | ADMIN | `Senha@123` |
| `member1@orbitdemo.com` | MEMBER | `Senha@123` |

Tenant: `10000000-0000-4000-a000-000000000001`

### URLs
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3333
- **Swagger**: http://localhost:3333/api
- **MinIO Console**: http://localhost:9001

---

## 🧪 Testes

```powershell
# No diretório server/

# Testes unitários + integração
npm run test

# Com cobertura (provider: v8)
npm run test:cov
```

Cobertura inclui:
- Unitários: `AuthService`, `LeadsService`, `ContactsService`, `DashboardService`, `StorageService`, `EventsGateway`
- Integração: fluxos completos de auth, leads, contacts, dashboard, team
- Segurança: isolamento multi-tenancy (Tenant A não acessa dados do Tenant B)

---

## Diferenciais Técnicos

### Multi-tenancy com isolamento por coluna
Toda query filtra obrigatoriamente por `tenantId`. `MEMBER` tem scoping adicional por `ownerId`. Testado com spec dedicado de segurança.

### Kanban real-time colaborativo
Drag & drop com `@hello-pangea/dnd` (estilo Trello) + WebSocket broadcast para todos os membros do tenant. Optimistic update com rollback em caso de erro.

### Endpoint público de captação
`POST /leads/public/:tenantId` funciona sem autenticação — ideal para embeddar formulários de landing pages em sites externos que alimentam o funil automaticamente.

### Arquitetura limpa e testável
Controllers finos, Services isolados, DTOs com `class-validator`, variáveis de ambiente validadas com Zod, sem `any` implícito (TypeScript strict).

---

## Roadmap

### ✅ Concluído
- Autenticação JWT com RBAC completo
- Pipeline Kanban de leads (7 etapas, drag & drop, real-time)
- CRUD de contatos com soft-delete
- Conversão de lead em contato
- Captura pública de leads (sem auth)
- Dashboard analítico com gráficos (Recharts)
- Gestão de equipe com convites por e-mail (BullMQ)
- Upload para MinIO via Presigned URLs
- WebSocket Gateway com autenticação JWT
- Multi-tenancy testado com spec de segurança
- Suite de testes unitários e de integração

### 🔜 Próximos Passos
- [ ] Atividades vinculadas a leads e contatos (timeline)
- [ ] Notificações in-app via WebSocket
- [ ] Relatórios exportáveis (PDF/CSV)
- [ ] Testes E2E com Playwright
- [ ] CI/CD com GitHub Actions (lint, test, build)
- [ ] Manifestos Kubernetes (API + Worker separados)
- [ ] Worker standalone para separação em produção

---

## Autor

**Luiz Nascimento**  
[LinkedIn](https://linkedin.com/in/luiznascimentodev) · [GitHub](https://github.com/luiznascimentodev)

---

## Licença

[MIT License](LICENSE)

---

<div align="center">

**Projeto em desenvolvimento ativo — acompanhe o progresso nas Issues e no [Roadmap](ROADMAP.md)**

</div>


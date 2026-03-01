# Orbit CRM — Copilot Instructions

Monorepo NestJS 11 + React 19. Backend em `server/`, frontend em `web/`. Multi-tenant com isolamento por coluna `tenantId`.

## Architecture

- **NestJS Modular Monolith** com `FastifyAdapter` (não Express). Cada domínio vive em `server/src/<domain>/` com `module`, `controller`, `service` e `dto/`.
- `ConfigModule` com `isGlobal: true`; `PrismaModule` exporta `PrismaService` globalmente.
- Infraestrutura transversal em `server/src/common/` — guards, filters, decorators, enums.
- Todos os modelos Prisma têm PK UUID, `tenantId` indexado, `createdAt`/`updatedAt` `@db.Timestamptz` e `onDelete: Cascade` a partir do `Tenant`.
- Lead, Contact e Deal usam **soft-delete** (`deletedAt: DateTime?`), nunca exclusão física.

### Separação de domínios: Lead vs. Deal

| Entidade    | Propósito                                  | Stages                                                  | Campo no banco                   |
| ----------- | ------------------------------------------ | ------------------------------------------------------- | -------------------------------- |
| **Lead**    | Funil de prospecção                        | `new→contacted→qualified→proposal→negotiation→won/lost` | `status: String` (não enum)      |
| **Deal**    | Oportunidade comercial vinculada a Contact | `PROSPECTING→…→CLOSED_WON/CLOSED_LOST`                  | `stage: DealStage` (Prisma enum) |
| **Contact** | Lead convertido / cliente ativo            | —                                                       | —                                |

- **`/pipeline`** → Kanban de **Leads** (funil de entrada). Converte lead em contato via `POST /leads/:id/convert`.
- **Deals** → página separada futura (`/deals`); types em `web/src/pages/pipeline/types.ts` + `deals.api.ts`.

### Endpoint público (sem auth)

Criar um controller separado sem `@UseGuards` — não existe decorator `@Public()` no projeto:

```typescript
@Controller('leads/public') // controller separado, sem guards
export class PublicLeadsController {}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('leads') // controller protegido normal
export class LeadsController {}
```

Registrar ambos no mesmo módulo: `controllers: [LeadsController, PublicLeadsController]`.

## Build and Test

```bash
# Raiz
npm run dev:server      # NestJS watch mode (:3333)
npm run dev:web         # Vite dev server (:5173)

# server/
npm run start:dev       # nest start --watch  (sem clean — evita EBUSY no Windows)
npm run test            # vitest run
npm run test:cov        # vitest --coverage (provider: v8)

# web/
npm run dev
npm run generate:sdk    # regenera SDK via @hey-api/openapi-ts (requer server :3333)
```

Docker: `docker-compose up -d` — Postgres 5432, Redis 6379, MinIO 9000.
Seed: `npm run seed --workspace=server` — credenciais fixas documentadas em `server/prisma/seed.ts`.

> **Windows**: use PowerShell. `rmdir /S /Q` não existe — use `Remove-Item -Recurse -Force <pasta>`.
> Se `start:dev` falhar com EBUSY: `taskkill /F /IM node.exe` e tente novamente.
> Após alterar `schema.prisma`: sempre rodar `npx prisma generate` antes de compilar.

## Backend Conventions

### Prisma — null vs undefined em campos opcionais

Campos opcionais no Prisma (`String?`) nunca devem receber `null` explicitamente em `create`/`update` — usar `undefined` para omitir:

```typescript
// ❌ erro TS: Type 'null' is not assignable to type 'string'
contactId: dto.contactId ?? null,

// ✅ correto: undefined omite o campo da query
contactId: dto.contactId ?? undefined,
```

Após alterar o `schema.prisma`, sempre rodar `npx prisma generate` para atualizar os tipos antes de compilar.

### MEMBER scoping em todo service

```typescript
if (user.role === Role.MEMBER) {
  where.ownerId = user.userId; // MEMBER vê apenas seus próprios recursos
}
```

### ownerSelect padrão

```typescript
private ownerSelect = { select: { id: true, name: true, email: true } };
// usar em todos os includes para evitar expor passwordHash
```

### Auth & RBAC

- Hierarquia: `OWNER > ADMIN > MEMBER`.
- Proteger rotas com `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(Role.ADMIN)`.
- `LeadOwnershipGuard` em `server/src/common/guards/` — faz query no banco; OWNER/ADMIN passam livre.
- JWT payload: `{ sub, email, tenantId, role }` → injetado em `req.user` como `{ userId, email, tenantId, role }`.
- Hashing de senha: **argon2** (nunca bcrypt).

### Testes de Integração

- Usar `createTestApplication()` de `server/src/test/helpers/test-application.factory.ts`.
- Chamar HTTP via `application.inject()` (não `supertest` contra porta real).
- `beforeEach`: `cleanDatabase()` → `seedTestTenant(prisma)`.
- `TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'`.

## Frontend Conventions

### Estrutura por domínio (`web/src/pages/<domain>/`)

```
<entity>-types.ts         # interfaces TypeScript locais (NUNCA editar web/src/generated/api/)
<entity>.api.ts           # funções fetch com authHeaders() via localStorage
<entity>-card.tsx         # card Kanban com drag handle e ações hover
<entity>-form-dialog.tsx  # modal criar/editar (React Hook Form + Controller para Selects)
<entity>-detail-sheet.tsx # painel lateral deslizante (estilo Pipedrive)
<page>-page.tsx           # orquestra DnD Kit + React Query + mutations
```

Leads: `lead-types.ts` + `leads.api.ts`. Deals (futuro): `types.ts` + `deals.api.ts`.

### API Client pattern

```typescript
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';
function authHeaders() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

SDK gerado em `web/src/generated/api/` **não editar manualmente** — regenerar via `npm run generate:sdk`.
Configurar baseUrl em `web/src/lib/api-client.ts`.

### Kanban (DnD Kit)

- `PointerSensor` com `activationConstraint: { distance: 8 }` (evita clique acidental).
- `onDragEnd`: chamar `PATCH /<entity>/:id/move-stage` e `queryClient.invalidateQueries`.
- `DragOverlay` com `rotate-2` para feedback visual.

## Code Style

- TypeScript strict em ambos os lados.
- **Vitest** (não Jest). Usar `describe/it/expect` sem import (globals: true).
- DTOs decorados com `class-validator` + `class-transformer`.
- Variáveis de ambiente validadas via Zod em `server/src/common/env/env.validation.ts`.
- Erros HTTP via exceções nativas do NestJS (`NotFoundException`, etc.).

## Commit Convention

```
feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert(<scope>): <descrição>
```

## Security

- `JWT_SECRET` exige mínimo 32 caracteres (validado no Zod).
- `helmet` + `cors` via Fastify em `server/src/main.ts`.
- Upload: presigned URLs diretas para MinIO/S3 — nunca proxy do binário pelo servidor.
- Multi-tenancy: **sempre** filtrar queries com `tenantId`.

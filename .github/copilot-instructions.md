# Orbit CRM — Copilot Instructions

Monorepo NestJS 11 + React 19. Backend em `server/`, frontend em `web/`. Multi-tenant com isolamento por coluna `tenantId`.

## Architecture

- **NestJS Modular Monolith** com `FastifyAdapter` (não Express). Cada domínio vive em `server/src/<domain>/` com `module`, `controller`, `service` e `dto/`.
- `ConfigModule` com `isGlobal: true`; `PrismaModule` exporta `PrismaService` globalmente.
- Infraestrutura transversal em `server/src/common/` — guards, filters, decorators, enums.
- Todos os modelos Prisma têm PK UUID, `tenantId` indexado, `createdAt`/`updatedAt` `@db.Timestamptz` e `onDelete: Cascade` a partir do `Tenant`.
- Lead, Contact e Deal usam **soft-delete** (`deletedAt: DateTime?`), nunca exclusão física.

## Build and Test

```bash
# Raiz — monorepo
npm run dev:server      # NestJS watch mode
npm run dev:web         # Vite dev server
npm run test            # vitest run (server)

# server/
npm run start:dev       # nest build + watch
npm run test            # vitest run
npm run test:watch      # vitest interativo
npm run test:cov        # vitest --coverage (provider: v8)

# web/
npm run dev             # vite
npm run build           # tsc -b && vite build
npm run generate:sdk    # regenera SDK a partir do Swagger (requer server rodando)
```

Docker: `docker-compose up -d` — Postgres 5432, Redis 6379, MinIO 9000.

## Code Style

- TypeScript strict em ambos os lados.
- **Vitest** (não Jest). Não criar/editar `jest.config.js`. Usar `describe/it/expect` sem import (globals: true).
- DTOs decorados com `class-validator` + `class-transformer`. Exemplo: [server/src/auth/dto/register.dto.ts](server/src/auth/dto/register.dto.ts).
- Variáveis de ambiente validadas via Zod em [server/src/common/env/env.validation.ts](server/src/common/env/env.validation.ts) — adicionar novas variáveis sempre neste schema.
- Erros HTTP via `throw new HttpException` / exceções nativas do NestJS — o `AllExceptionsFilter` padroniza a resposta RFC-like.

## Project Conventions

### Testes de Integração

- Usar `createTestApplication()` de [server/src/test/helpers/test-application.factory.ts](server/src/test/helpers/test-application.factory.ts) para subir a app completa com `NestFastifyApplication`.
- Chamar HTTP via `application.inject()` (não `supertest` contra porta real).
- `beforeEach`: `cleanDatabase()` → `seedTestTenant(prisma)`.
- `TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'` — UUID estático para asserts determinísticos.

```typescript
// Padrão de integration spec
beforeAll(async () => {
  application = await createTestApplication();
  prisma = application.get(PrismaService);
});
afterAll(async () => application.close());
beforeEach(async () => {
  await cleanDatabase(prisma);
  await seedTestTenant(prisma);
});
const res = await application.inject({
  method: 'POST',
  url: '/auth/register',
  payload: dto,
});
expect(res.statusCode).toBe(201);
```

### Auth & RBAC

- Hierarquia: `OWNER > ADMIN > MEMBER`.
- Proteger rotas com `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(Role.ADMIN)`.
- Recursos de propriedade do lead usar `LeadOwnershipGuard` — faz query no banco; OWNER/ADMIN passam livre.
- JWT payload: `{ sub, email, tenantId, role }` → injetado em `req.user` como `{ userId, email, tenantId, role }`.
- Hashing de senha: **argon2** (nunca bcrypt).

### Frontend SDK

- Nunca editar `web/src/generated/api/` manualmente — gerado por `npm run generate:sdk` via `@hey-api/openapi-ts`.
- Configurar cliente em [web/src/lib/api-client.ts](web/src/lib/api-client.ts) (baseUrl + interceptor Bearer token).

## Commit Convention

Conventional Commits obrigatório (Husky + Commitlint):

```
feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert(<scope>): <descrição>
```

## Security

- `JWT_SECRET` exige mínimo 32 caracteres (validado no Zod e no `AuthModule`).
- `helmet` + `cors` configurados via Fastify em [server/src/main.ts](server/src/main.ts).
- Upload de arquivos: presigned URLs diretas para MinIO/S3 — nunca fazer proxy do binário pelo servidor.
- Multi-tenancy: **sempre** filtrar queries com `tenantId` — nunca retornar dados entre tenants.

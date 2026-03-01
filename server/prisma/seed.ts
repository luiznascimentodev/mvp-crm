/**
 * Database Seeder — Orbit CRM
 *
 * Popula o banco de desenvolvimento com dados fakes realistas.
 * Execute via: npm run seed --workspace=server
 *
 * IDs e credenciais são FIXOS para facilitar testes manuais.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Tenant 1 — "Orbit Demo Pro"                                    │
 * │  ID do Workspace: 10000000-0000-4000-a000-000000000001         │
 * │  owner@orbitdemo.com   · OWNER  · Senha@123                    │
 * │  admin@orbitdemo.com   · ADMIN  · Senha@123                    │
 * │  member1@orbitdemo.com · MEMBER · Senha@123                    │
 * │  member2@orbitdemo.com · MEMBER · Senha@123                    │
 * │  member3@orbitdemo.com · MEMBER · Senha@123                    │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Tenant 2 — "Acme Free"                                         │
 * │  ID do Workspace: 20000000-0000-4000-a000-000000000002         │
 * │  owner@acmefree.com    · OWNER  · Senha@123                    │
 * │  admin@acmefree.com    · ADMIN  · Senha@123                    │
 * │  member1@acmefree.com  · MEMBER · Senha@123                    │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { PrismaClient, Role } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/pt_BR';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'lost'];
const LEAD_SOURCES = [
  'website',
  'referral',
  'cold_call',
  'linkedin',
  'event',
  'email_campaign',
];
const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task', 'note'];

// Tenants com UUIDs FIXOS para uso previsível no login manual
const TENANTS = [
  {
    id: '10000000-0000-4000-a000-000000000001',
    name: 'Orbit Demo Pro',
    slug: 'orbit-demo-pro',
    plan: 'pro',
    domain: 'orbitdemo.com',
    memberCount: 3,
  },
  {
    id: '20000000-0000-4000-a000-000000000002',
    name: 'Acme Free',
    slug: 'acme-free',
    plan: 'free',
    domain: 'acmefree.com',
    memberCount: 1,
  },
];

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...\n');
  console.log('  ⚠️  Limpando banco de dados...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "tenants" CASCADE;');
  console.log('  ✅ Banco limpo.\n');

  const passwordHash = await argon2.hash('Senha@123');

  for (const tenantDef of TENANTS) {
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantDef.id,
        name: tenantDef.name,
        slug: tenantDef.slug,
        plan: tenantDef.plan,
      },
    });

    console.log(`  📦 Tenant: ${tenant.name} (${tenant.id})`);

    // ── Usuários (credenciais FIXAS) ─────────────────────────
    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `owner@${tenantDef.domain}`,
        name: 'Ana Carolina (OWNER)',
        passwordHash,
        role: Role.OWNER,
      },
    });

    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin@${tenantDef.domain}`,
        name: 'Bruno Mendes (ADMIN)',
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const members = await Promise.all(
      Array.from({ length: tenantDef.memberCount }, (_, i) =>
        prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: `member${i + 1}@${tenantDef.domain}`,
            name: faker.person.fullName(),
            passwordHash,
            role: Role.MEMBER,
          },
        }),
      ),
    );

    const allUsers = [owner, admin, ...members];

    console.log(`    👥 Users: ${allUsers.length}`);

    // ── Contacts ─────────────────────────────────────────────
    const contacts = await Promise.all(
      Array.from({ length: 50 }, () =>
        prisma.contact.create({
          data: {
            tenantId: tenant.id,
            ownerId: pick(allUsers).id,
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            phone: faker.phone.number(),
            company: faker.company.name(),
            position: faker.person.jobTitle(),
            website: faker.internet.url(),
            city: faker.location.city(),
            state: faker.location.state({ abbreviated: true }),
            country: 'Brasil',
            notes: faker.lorem.sentence(),
          },
        }),
      ),
    );

    console.log(`    📇 Contacts: ${contacts.length}`);

    // ── Leads ────────────────────────────────────────────────
    const leads = await Promise.all(
      Array.from({ length: 20 }, () =>
        prisma.lead.create({
          data: {
            tenantId: tenant.id,
            ownerId: pick(allUsers).id,
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            phone: faker.phone.number(),
            company: faker.company.name(),
            source: pick(LEAD_SOURCES),
            status: pick(LEAD_STATUSES),
            notes: faker.lorem.sentence(),
          },
        }),
      ),
    );

    console.log(`    🎯 Leads: ${leads.length}`);
    // ── Activities ───────────────────────────────────────────
    await Promise.all(
      Array.from({ length: 30 }, () => {
        const roll = Math.random();
        const leadId = roll < 0.5 ? pick(leads).id : null;
        const contactId = !leadId ? pick(contacts).id : null;

        const completed = faker.datatype.boolean();
        return prisma.activity.create({
          data: {
            tenantId: tenant.id,
            createdById: pick(allUsers).id,
            type: pick(ACTIVITY_TYPES),
            subject: faker.lorem.words(5),
            description: faker.lorem.sentence(),
            scheduledAt: faker.date.soon(),
            completedAt: completed ? faker.date.recent() : null,
            isCompleted: completed,
            durationMinutes:
              Math.random() > 0.5
                ? faker.number.int({ min: 5, max: 120 })
                : null,
            leadId,
            contactId,
          },
        });
      }),
    );

    console.log(`    📋 Activities: 30`);
    console.log();
  }

  // ── Resumo de credenciais ──────────────────────────────────
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          CREDENCIAIS DE TESTE — Orbit CRM                 ║');
  console.log('║          SENHA DE TODOS OS USUÁRIOS: Senha@123            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  TENANT 1 — Orbit Demo Pro                                ║');
  console.log('║  ID do Workspace: 10000000-0000-4000-a000-000000000001    ║');
  console.log('║   owner@orbitdemo.com   → OWNER                          ║');
  console.log('║   admin@orbitdemo.com   → ADMIN                          ║');
  console.log('║   member1@orbitdemo.com → MEMBER                         ║');
  console.log('║   member2@orbitdemo.com → MEMBER                         ║');
  console.log('║   member3@orbitdemo.com → MEMBER                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  TENANT 2 — Acme Free                                     ║');
  console.log('║  ID do Workspace: 20000000-0000-4000-a000-000000000002    ║');
  console.log('║   owner@acmefree.com    → OWNER                          ║');
  console.log('║   admin@acmefree.com    → ADMIN                          ║');
  console.log('║   member1@acmefree.com  → MEMBER                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

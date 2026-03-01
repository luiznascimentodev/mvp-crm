/**
 * Database Seeder — Orbit CRM
 *
 * Popula o banco de desenvolvimento com dados fakes realistas.
 * Execute via: npm run seed --workspace=server
 *
 * Estrutura criada:
 *  - 2 Tenants
 *  - Por tenant: 1 OWNER, 1 ADMIN, 3 MEMBERs
 *  - Por tenant: 50 Contacts (distribuídos entre membros)
 *  - Por tenant: 20 Leads
 *  - Por tenant: 10 Deals (ligados a contatos)
 *  - Por tenant: 30 Activities (distribuídas entre leads/contacts/deals)
 */

import { DealStage, PrismaClient, Role } from '@prisma/client';
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
const DEAL_STAGES = Object.values(DealStage);
const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task', 'note'];
const CURRENCIES = ['BRL', 'USD', 'EUR'];

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...');

  const passwordHash = await argon2.hash('Senha@123');

  for (let t = 1; t <= 2; t++) {
    const tenant = await prisma.tenant.create({
      data: {
        name: faker.company.name(),
        slug: `tenant-${t}-${faker.string.alphanumeric(6).toLowerCase()}`,
        plan: t === 1 ? 'pro' : 'free',
      },
    });

    console.log(`  📦 Tenant: ${tenant.name}`);

    // ── Usuários ─────────────────────────────────────────────
    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `owner${t}@seed.com`,
        name: faker.person.fullName(),
        passwordHash,
        role: Role.OWNER,
      },
    });

    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin${t}@seed.com`,
        name: faker.person.fullName(),
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const members = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: `member${t}_${i + 1}@seed.com`,
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

    // ── Deals ────────────────────────────────────────────────
    const deals = await Promise.all(
      Array.from({ length: 10 }, () => {
        const stage = pick(DEAL_STAGES);
        const probability =
          stage === DealStage.CLOSED_WON
            ? 100
            : stage === DealStage.CLOSED_LOST
              ? 0
              : faker.number.int({ min: 10, max: 90 });

        return prisma.deal.create({
          data: {
            tenantId: tenant.id,
            ownerId: pick(allUsers).id,
            contactId: pick(contacts).id,
            title: faker.commerce.productName() + ' Deal',
            description: faker.lorem.paragraph(),
            value: parseFloat(
              faker.finance.amount({ min: 1000, max: 500000, dec: 2 }),
            ),
            currency: pick(CURRENCIES),
            stage,
            probability,
            expectedCloseDate: faker.date.future(),
            isActive:
              stage !== DealStage.CLOSED_WON && stage !== DealStage.CLOSED_LOST,
            closedAt:
              stage === DealStage.CLOSED_WON || stage === DealStage.CLOSED_LOST
                ? faker.date.recent()
                : null,
          },
        });
      }),
    );

    console.log(`    💰 Deals: ${deals.length}`);

    // ── Activities ───────────────────────────────────────────
    await Promise.all(
      Array.from({ length: 30 }, () => {
        const roll = Math.random();
        const leadId = roll < 0.33 ? pick(leads).id : null;
        const contactId = !leadId && roll < 0.66 ? pick(contacts).id : null;
        const dealId = !leadId && !contactId ? pick(deals).id : null;

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
            dealId,
          },
        });
      }),
    );

    console.log(`    📋 Activities: 30`);
  }

  console.log('\n✅ Seed completed!');
  console.log('   Credentials (all users): Senha@123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

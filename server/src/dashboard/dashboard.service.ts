import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LEAD_STAGE_ORDER = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export type LeadStatus = (typeof LEAD_STAGE_ORDER)[number];

export interface DashboardMetrics {
  totalContacts: number;
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  leadsByStatus: { status: string; count: number }[];
}

export interface LeadsOverTimeItem {
  date: string;
  count: number;
}

export interface TopPerformerItem {
  userId: string;
  userName: string;
  wonLeads: number;
}

export interface FunnelItem {
  status: string;
  count: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const [totalContacts, totalLeads, wonLeads, leadsByStatus] =
      await Promise.all([
        this.prisma.contact.count({
          where: { tenantId, deletedAt: null },
        }),
        this.prisma.lead.count({
          where: { tenantId, deletedAt: null },
        }),
        this.prisma.lead.count({
          where: { tenantId, deletedAt: null, status: 'won' },
        }),
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { tenantId, deletedAt: null },
          _count: { id: true },
        }),
      ]);

    const conversionRate =
      totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    return {
      totalContacts,
      totalLeads,
      wonLeads,
      conversionRate,
      leadsByStatus: leadsByStatus.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
    };
  }

  async getLeadsOverTime(
    tenantId: string,
    days = 30,
  ): Promise<LeadsOverTimeItem[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const leads = await this.prisma.lead.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, number>();
    for (const lead of leads) {
      const date = lead.createdAt.toISOString().slice(0, 10);
      grouped.set(date, (grouped.get(date) ?? 0) + 1);
    }

    return Array.from(grouped.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  async getTopPerformers(tenantId: string): Promise<TopPerformerItem[]> {
    const wonByOwner = await this.prisma.lead.groupBy({
      by: ['ownerId'],
      where: {
        tenantId,
        deletedAt: null,
        status: 'won',
        ownerId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const ownerIds = wonByOwner
      .map((r) => r.ownerId)
      .filter(Boolean) as string[];

    const users = await this.prisma.user.findMany({
      where: { id: { in: ownerIds }, tenantId },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return wonByOwner
      .filter((r) => r.ownerId !== null)
      .map((r) => ({
        userId: r.ownerId!,
        userName: userMap.get(r.ownerId!) ?? 'Desconhecido',
        wonLeads: r._count.id,
      }));
  }

  async getLeadsFunnel(tenantId: string): Promise<FunnelItem[]> {
    const rows = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
    });

    const map = new Map(rows.map((r) => [r.status, r._count.id]));

    return LEAD_STAGE_ORDER.map((status) => ({
      status,
      count: map.get(status) ?? 0,
    }));
  }
}

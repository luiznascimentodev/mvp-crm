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

// ─── Interfaces de saída ────────────────────────────────────────────────────

export interface DashboardMetrics {
  // KPIs principais
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number; // won / (won + lost) — taxa real de fechamento
  lostRate: number; // lost / (won + lost)

  // Velocidade de pipeline
  newLeadsThisMonth: number;
  newLeadsLastMonth: number;
  newLeadsTrend: number; // % variação mês vs mês anterior

  // Engajamento
  totalContacts: number;
  leadsInNegotiation: number; // leads quentes na reta final
  avgDaysToConvert: number | null; // tempo médio para ganhar um lead (dias)

  // Distribuição por status
  leadsByStatus: { status: string; count: number }[];
}

export interface LeadsOverTimeItem {
  date: string;
  count: number;
  won: number;
  lost: number;
}

export interface TopPerformerItem {
  userId: string;
  userName: string;
  wonLeads: number;
  totalLeads: number;
  conversionRate: number;
}

export interface FunnelItem {
  status: string;
  count: number;
  conversionToNext: number | null; // % que avança para o próximo estágio
}

export interface SourceItem {
  source: string;
  total: number;
  won: number;
  conversionRate: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalLeads,
      activeLeads,
      wonLeads,
      lostLeads,
      totalContacts,
      newThisMonth,
      newLastMonth,
      leadsInNegotiation,
      leadsByStatus,
      wonLeadsWithDates,
    ] = await Promise.all([
      // Total geral (não deletados)
      this.prisma.lead.count({ where: { tenantId, deletedAt: null } }),

      // Ativos = excluindo won e lost
      this.prisma.lead.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: ['won', 'lost'] },
        },
      }),

      // Ganhos
      this.prisma.lead.count({
        where: { tenantId, deletedAt: null, status: 'won' },
      }),

      // Perdidos
      this.prisma.lead.count({
        where: { tenantId, deletedAt: null, status: 'lost' },
      }),

      // Contatos convertidos
      this.prisma.contact.count({ where: { tenantId, deletedAt: null } }),

      // Novos este mês
      this.prisma.lead.count({
        where: {
          tenantId,
          deletedAt: null,
          createdAt: { gte: startOfThisMonth },
        },
      }),

      // Novos mês anterior
      this.prisma.lead.count({
        where: {
          tenantId,
          deletedAt: null,
          createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
      }),

      // Leads em negociação (quentes)
      this.prisma.lead.count({
        where: { tenantId, deletedAt: null, status: 'negotiation' },
      }),

      // Distribuição por status
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),

      // Leads ganhos com datas para calcular tempo médio
      this.prisma.lead.findMany({
        where: { tenantId, deletedAt: null, status: 'won' },
        select: { createdAt: true, updatedAt: true },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Taxa de conversão real: won / (won + lost)
    const closed = wonLeads + lostLeads;
    const conversionRate =
      closed > 0 ? Math.round((wonLeads / closed) * 100) : 0;
    const lostRate = closed > 0 ? Math.round((lostLeads / closed) * 100) : 0;

    // Tendência mensal (% variação)
    const newLeadsTrend =
      newLastMonth > 0
        ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
        : newThisMonth > 0
          ? 100
          : 0;

    // Tempo médio para converter (em dias)
    let avgDaysToConvert: number | null = null;
    if (wonLeadsWithDates.length > 0) {
      const totalMs = wonLeadsWithDates.reduce((acc, lead) => {
        return acc + (lead.updatedAt.getTime() - lead.createdAt.getTime());
      }, 0);
      avgDaysToConvert = Math.round(
        totalMs / wonLeadsWithDates.length / (1000 * 60 * 60 * 24),
      );
    }

    return {
      totalLeads,
      activeLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      lostRate,
      newLeadsThisMonth: newThisMonth,
      newLeadsLastMonth: newLastMonth,
      newLeadsTrend,
      totalContacts,
      leadsInNegotiation,
      avgDaysToConvert,
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
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<
      string,
      { count: number; won: number; lost: number }
    >();

    for (const lead of leads) {
      const date = lead.createdAt.toISOString().slice(0, 10);
      const entry = grouped.get(date) ?? { count: 0, won: 0, lost: 0 };
      entry.count += 1;
      if (lead.status === 'won') entry.won += 1;
      if (lead.status === 'lost') entry.lost += 1;
      grouped.set(date, entry);
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  async getTopPerformers(tenantId: string): Promise<TopPerformerItem[]> {
    const [wonByOwner, totalByOwner] = await Promise.all([
      this.prisma.lead.groupBy({
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
      }),
      this.prisma.lead.groupBy({
        by: ['ownerId'],
        where: { tenantId, deletedAt: null, ownerId: { not: null } },
        _count: { id: true },
      }),
    ]);

    const ownerIds = wonByOwner
      .map((r) => r.ownerId)
      .filter(Boolean) as string[];

    const users = await this.prisma.user.findMany({
      where: { id: { in: ownerIds }, tenantId },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const totalMap = new Map(totalByOwner.map((r) => [r.ownerId, r._count.id]));

    return wonByOwner
      .filter((r) => r.ownerId !== null)
      .map((r) => {
        const total = totalMap.get(r.ownerId) ?? r._count.id;
        return {
          userId: r.ownerId!,
          userName: userMap.get(r.ownerId!) ?? 'Desconhecido',
          wonLeads: r._count.id,
          totalLeads: total,
          conversionRate:
            total > 0 ? Math.round((r._count.id / total) * 100) : 0,
        };
      });
  }

  async getLeadsFunnel(tenantId: string): Promise<FunnelItem[]> {
    const rows = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
    });

    const map = new Map(rows.map((r) => [r.status, r._count.id]));

    const stagesWithCounts = LEAD_STAGE_ORDER.map((status) => ({
      status,
      count: map.get(status) ?? 0,
    }));

    // Calcula % conversão para o próximo estágio (excluindo 'lost')
    const activeStages = stagesWithCounts.filter((s) => s.status !== 'lost');

    return stagesWithCounts.map((item) => {
      if (item.status === 'lost') {
        return { ...item, conversionToNext: null };
      }
      const nextStageIndex =
        activeStages.findIndex((s) => s.status === item.status) + 1;
      const nextStage = activeStages[nextStageIndex];
      const conversionToNext =
        nextStage && item.count > 0
          ? Math.round((nextStage.count / item.count) * 100)
          : null;
      return { ...item, conversionToNext };
    });
  }

  async getLeadsBySource(tenantId: string): Promise<SourceItem[]> {
    const [allBySource, wonBySource] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null, status: 'won' },
        _count: { id: true },
      }),
    ]);

    const wonMap = new Map(
      wonBySource.map((r) => [r.source ?? 'Direto', r._count.id]),
    );

    return allBySource.map((r) => {
      const sourceLabel = r.source ?? 'Direto';
      const won = wonMap.get(sourceLabel) ?? 0;
      const total = r._count.id;
      return {
        source: sourceLabel,
        total,
        won,
        conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
      };
    });
  }
}

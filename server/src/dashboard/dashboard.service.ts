import { Injectable } from '@nestjs/common';
import { DealStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardMetrics {
  totalContacts: number;
  totalDeals: number;
  activeDeals: number;
  pipelineValue: number;
  conversionRate: number;
  dealsByStage: { stage: DealStage; count: number; value: number }[];
}

export interface DealsOverTimeItem {
  date: string;
  count: number;
  totalValue: number;
}

export interface TopPerformerItem {
  userId: string;
  userName: string;
  wonDeals: number;
  wonValue: number;
}

export interface FunnelItem {
  stage: DealStage;
  count: number;
  value: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const [totalContacts, totalDeals, activeDeals, wonDeals, dealsByStage] =
      await Promise.all([
        this.prisma.contact.count({
          where: { tenantId, deletedAt: null },
        }),
        this.prisma.deal.count({
          where: { tenantId, deletedAt: null },
        }),
        this.prisma.deal.count({
          where: {
            tenantId,
            deletedAt: null,
            stage: {
              notIn: [DealStage.CLOSED_WON, DealStage.CLOSED_LOST],
            },
          },
        }),
        this.prisma.deal.count({
          where: { tenantId, deletedAt: null, stage: DealStage.CLOSED_WON },
        }),
        this.prisma.deal.groupBy({
          by: ['stage'],
          where: { tenantId, deletedAt: null },
          _count: { id: true },
          _sum: { value: true },
        }),
      ]);

    const pipelineAgg = await this.prisma.deal.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        stage: { notIn: [DealStage.CLOSED_WON, DealStage.CLOSED_LOST] },
      },
      _sum: { value: true },
    });

    const pipelineValue = pipelineAgg._sum.value
      ? Number(pipelineAgg._sum.value.toString())
      : 0;

    const conversionRate =
      totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;

    return {
      totalContacts,
      totalDeals,
      activeDeals,
      pipelineValue,
      conversionRate,
      dealsByStage: dealsByStage.map((item) => ({
        stage: item.stage,
        count: item._count.id,
        value: item._sum.value ? Number(item._sum.value.toString()) : 0,
      })),
    };
  }

  async getDealsOverTime(
    tenantId: string,
    days = 30,
  ): Promise<DealsOverTimeItem[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const deals = await this.prisma.deal.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true, value: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, { count: number; totalValue: number }>();
    for (const deal of deals) {
      const date = deal.createdAt.toISOString().slice(0, 10);
      const existing = grouped.get(date) ?? { count: 0, totalValue: 0 };
      existing.count += 1;
      existing.totalValue += deal.value ? Number(deal.value.toString()) : 0;
      grouped.set(date, existing);
    }

    return Array.from(grouped.entries()).map(([date, stats]) => ({
      date,
      count: stats.count,
      totalValue: stats.totalValue,
    }));
  }

  async getTopPerformers(tenantId: string): Promise<TopPerformerItem[]> {
    const wonByOwner = await this.prisma.deal.groupBy({
      by: ['ownerId'],
      where: {
        tenantId,
        deletedAt: null,
        stage: DealStage.CLOSED_WON,
        ownerId: { not: null },
      },
      _count: { id: true },
      _sum: { value: true },
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
        wonDeals: r._count.id,
        wonValue: r._sum.value ? Number(r._sum.value.toString()) : 0,
      }));
  }

  async getConversionFunnel(tenantId: string): Promise<FunnelItem[]> {
    const rows = await this.prisma.deal.groupBy({
      by: ['stage'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
      _sum: { value: true },
    });

    const stageOrder: DealStage[] = [
      DealStage.PROSPECTING,
      DealStage.QUALIFICATION,
      DealStage.PROPOSAL,
      DealStage.NEGOTIATION,
      DealStage.CLOSED_WON,
      DealStage.CLOSED_LOST,
    ];

    const map = new Map(rows.map((r) => [r.stage, r]));

    return stageOrder.map((stage) => {
      const row = map.get(stage);
      return {
        stage,
        count: row?._count.id ?? 0,
        value: row?._sum.value ? Number(row._sum.value.toString()) : 0,
      };
    });
  }
}

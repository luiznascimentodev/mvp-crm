import { DealStage } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service';

const mockPrisma = {
  contact: { count: vi.fn() },
  deal: {
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  user: { findMany: vi.fn() },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardService(mockPrisma as never);
  });

  describe('getMetrics', () => {
    it('should return aggregated metrics', async () => {
      mockPrisma.contact.count.mockResolvedValue(10);
      mockPrisma.deal.count
        .mockResolvedValueOnce(20) // totalDeals
        .mockResolvedValueOnce(15) // activeDeals
        .mockResolvedValueOnce(4); // wonDeals
      mockPrisma.deal.groupBy.mockResolvedValue([
        {
          stage: DealStage.CLOSED_WON,
          _count: { id: 4 },
          _sum: { value: { toString: () => '8000' } },
        },
        {
          stage: DealStage.PROSPECTING,
          _count: { id: 16 },
          _sum: { value: { toString: () => '32000' } },
        },
      ]);
      mockPrisma.deal.aggregate.mockResolvedValue({
        _sum: { value: { toString: () => '32000' } },
      });

      const result = await service.getMetrics('tenant-1');

      expect(result.totalContacts).toBe(10);
      expect(result.totalDeals).toBe(20);
      expect(result.activeDeals).toBe(15);
      expect(result.conversionRate).toBe(20); // 4/20 * 100
      expect(result.pipelineValue).toBe(32000);
      expect(result.dealsByStage).toHaveLength(2);
    });

    it('should return 0 conversionRate when no deals', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.deal.groupBy.mockResolvedValue([]);
      mockPrisma.deal.aggregate.mockResolvedValue({ _sum: { value: null } });

      const result = await service.getMetrics('tenant-1');

      expect(result.conversionRate).toBe(0);
      expect(result.pipelineValue).toBe(0);
    });
  });

  describe('getDealsOverTime', () => {
    it('should group deals by day', async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.deal.findMany.mockResolvedValue([
        {
          createdAt: now,
          value: { toString: () => '1000' },
        },
        {
          createdAt: now,
          value: { toString: () => '2000' },
        },
        {
          createdAt: yesterday,
          value: { toString: () => '500' },
        },
      ]);

      const result = await service.getDealsOverTime('tenant-1', 30);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const todayStr = now.toISOString().slice(0, 10);
      const todayItem = result.find((r) => r.date === todayStr);
      expect(todayItem?.count).toBe(2);
      expect(todayItem?.totalValue).toBe(3000);
    });

    it('should return empty array when no deals in range', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);

      const result = await service.getDealsOverTime('tenant-1', 7);

      expect(result).toEqual([]);
    });
  });

  describe('getTopPerformers', () => {
    it('should return top performers with names', async () => {
      mockPrisma.deal.groupBy.mockResolvedValue([
        {
          ownerId: 'user-1',
          _count: { id: 5 },
          _sum: { value: { toString: () => '50000' } },
        },
        {
          ownerId: 'user-2',
          _count: { id: 3 },
          _sum: { value: { toString: () => '30000' } },
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
      ]);

      const result = await service.getTopPerformers('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        userId: 'user-1',
        userName: 'Alice',
        wonDeals: 5,
        wonValue: 50000,
      });
    });

    it('should return empty when no closed_won deals', async () => {
      mockPrisma.deal.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getTopPerformers('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('getConversionFunnel', () => {
    it('should return all stages in order', async () => {
      mockPrisma.deal.groupBy.mockResolvedValue([
        {
          stage: DealStage.CLOSED_WON,
          _count: { id: 2 },
          _sum: { value: { toString: () => '2000' } },
        },
        {
          stage: DealStage.PROSPECTING,
          _count: { id: 10 },
          _sum: { value: { toString: () => '10000' } },
        },
      ]);

      const result = await service.getConversionFunnel('tenant-1');

      expect(result).toHaveLength(6);
      expect(result[0].stage).toBe(DealStage.PROSPECTING);
      expect(result[0].count).toBe(10);
      expect(result[4].stage).toBe(DealStage.CLOSED_WON);
      expect(result[4].count).toBe(2);
      // Missing stages should have count 0
      expect(result[1].count).toBe(0);
    });

    it('should fill 0 for stages with no deals', async () => {
      mockPrisma.deal.groupBy.mockResolvedValue([]);

      const result = await service.getConversionFunnel('tenant-1');

      expect(result).toHaveLength(6);
      result.forEach((item) => {
        expect(item.count).toBe(0);
        expect(item.value).toBe(0);
      });
    });
  });
});

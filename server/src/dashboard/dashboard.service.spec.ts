import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service';

const mockPrisma = {
  contact: { count: vi.fn() },
  lead: {
    count: vi.fn(),
    groupBy: vi.fn(),
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
      mockPrisma.lead.count
        .mockResolvedValueOnce(20) // totalLeads
        .mockResolvedValueOnce(4); // wonLeads
      mockPrisma.lead.groupBy.mockResolvedValue([
        { status: 'won', _count: { id: 4 } },
        { status: 'new', _count: { id: 16 } },
      ]);

      const result = await service.getMetrics('tenant-1');

      expect(result.totalContacts).toBe(10);
      expect(result.totalLeads).toBe(20);
      expect(result.wonLeads).toBe(4);
      expect(result.conversionRate).toBe(20); // 4/20 * 100
      expect(result.leadsByStatus).toHaveLength(2);
    });

    it('should return 0 conversionRate when no leads', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.lead.count.mockResolvedValue(0);
      mockPrisma.lead.groupBy.mockResolvedValue([]);

      const result = await service.getMetrics('tenant-1');

      expect(result.conversionRate).toBe(0);
    });
  });

  describe('getLeadsOverTime', () => {
    it('should group leads by day', async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.lead.findMany.mockResolvedValue([
        { createdAt: now },
        { createdAt: now },
        { createdAt: yesterday },
      ]);

      const result = await service.getLeadsOverTime('tenant-1', 30);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const todayStr = now.toISOString().slice(0, 10);
      const todayItem = result.find((r) => r.date === todayStr);
      expect(todayItem?.count).toBe(2);
    });

    it('should return empty array when no leads in range', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);

      const result = await service.getLeadsOverTime('tenant-1', 7);

      expect(result).toEqual([]);
    });
  });

  describe('getTopPerformers', () => {
    it('should return top performers with names', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([
        { ownerId: 'user-1', _count: { id: 5 } },
        { ownerId: 'user-2', _count: { id: 3 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Ana Carolina' },
        { id: 'user-2', name: 'Bruno Mendes' },
      ]);

      const result = await service.getTopPerformers('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].wonLeads).toBe(5);
      expect(result[0].userName).toBe('Ana Carolina');
    });

    it('should return empty when no won leads', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getTopPerformers('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('getLeadsFunnel', () => {
    it('should return all stages ordered', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([
        { status: 'new', _count: { id: 10 } },
        { status: 'won', _count: { id: 3 } },
      ]);

      const result = await service.getLeadsFunnel('tenant-1');

      expect(result).toHaveLength(7);
      expect(result[0].status).toBe('new');
      expect(result[0].count).toBe(10);
      expect(result[5].status).toBe('won');
      expect(result[5].count).toBe(3);
      expect(result[6].status).toBe('lost');
      expect(result[6].count).toBe(0);
    });
  });
});

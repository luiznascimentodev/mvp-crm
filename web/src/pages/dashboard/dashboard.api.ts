import type { DealStage } from './dashboard.types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${BASE}/dashboard/metrics`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar métricas');
  return res.json() as Promise<DashboardMetrics>;
}

export async function fetchDealsOverTime(
  days = 30,
): Promise<DealsOverTimeItem[]> {
  const res = await fetch(`${BASE}/dashboard/deals-over-time?days=${days}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar deals por período');
  return res.json() as Promise<DealsOverTimeItem[]>;
}

export async function fetchTopPerformers(): Promise<TopPerformerItem[]> {
  const res = await fetch(`${BASE}/dashboard/top-performers`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar top performers');
  return res.json() as Promise<TopPerformerItem[]>;
}

export async function fetchConversionFunnel(): Promise<FunnelItem[]> {
  const res = await fetch(`${BASE}/dashboard/funnel`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar funil de conversão');
  return res.json() as Promise<FunnelItem[]>;
}

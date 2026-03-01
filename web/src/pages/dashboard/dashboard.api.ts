const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${BASE}/dashboard/metrics`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar metricas');
  return res.json() as Promise<DashboardMetrics>;
}

export async function fetchLeadsOverTime(
  days = 30,
): Promise<LeadsOverTimeItem[]> {
  const res = await fetch(`${BASE}/dashboard/leads-over-time?days=${days}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar leads por periodo');
  return res.json() as Promise<LeadsOverTimeItem[]>;
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
  if (!res.ok) throw new Error('Erro ao buscar funil');
  return res.json() as Promise<FunnelItem[]>;
}

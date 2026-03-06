const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  lostRate: number;
  newLeadsThisMonth: number;
  newLeadsLastMonth: number;
  newLeadsTrend: number;
  totalContacts: number;
  leadsInNegotiation: number;
  avgDaysToConvert: number | null;
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
  conversionToNext: number | null;
}

export interface SourceItem {
  source: string;
  total: number;
  won: number;
  conversionRate: number;
}

// ─── Fetch functions ─────────────────────────────────────────────────────────

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

export async function fetchLeadsBySource(): Promise<SourceItem[]> {
  const res = await fetch(`${BASE}/dashboard/leads-by-source`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar leads por fonte');
  return res.json() as Promise<SourceItem[]>;
}

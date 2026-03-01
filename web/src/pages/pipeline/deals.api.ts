import type {
  CreateDealDto,
  Deal,
  DealsResponse,
  MoveStageDealDto,
  UpdateDealDto,
} from './types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDeals(params?: {
  page?: number;
  limit?: number;
  stage?: string;
}): Promise<DealsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.stage) query.set('stage', params.stage);

  const res = await fetch(`${BASE}/deals?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar deals');
  return res.json() as Promise<DealsResponse>;
}

export async function createDeal(dto: CreateDealDto): Promise<Deal> {
  const res = await fetch(`${BASE}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao criar deal');
  }
  return res.json() as Promise<Deal>;
}

export async function updateDeal(
  id: string,
  dto: UpdateDealDto,
): Promise<Deal> {
  const res = await fetch(`${BASE}/deals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao atualizar deal');
  }
  return res.json() as Promise<Deal>;
}

export async function moveDealStage(
  id: string,
  dto: MoveStageDealDto,
): Promise<Deal> {
  const res = await fetch(`${BASE}/deals/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao mover estágio');
  }
  return res.json() as Promise<Deal>;
}

export async function deleteDeal(id: string): Promise<void> {
  const res = await fetch(`${BASE}/deals/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao remover deal');
}

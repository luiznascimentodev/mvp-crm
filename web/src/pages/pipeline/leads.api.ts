import type {
  Lead,
  LeadsResponse,
  CreateLeadDto,
  UpdateLeadDto,
  MoveLeadStageDto,
  FilterLeadsDto,
} from './lead-types';
import type { Contact } from '../contacts/types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchLeads(
  params: FilterLeadsDto = {},
): Promise<LeadsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.order) query.set('order', params.order);

  const res = await fetch(`${BASE}/leads?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar leads');
  return res.json() as Promise<LeadsResponse>;
}

export async function fetchLead(id: string): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar lead');
  return res.json() as Promise<Lead>;
}

export async function createLead(dto: CreateLeadDto): Promise<Lead> {
  const res = await fetch(`${BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao criar lead');
  }
  return res.json() as Promise<Lead>;
}

export async function updateLead(
  id: string,
  dto: UpdateLeadDto,
): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao atualizar lead');
  }
  return res.json() as Promise<Lead>;
}

export async function moveLead(
  id: string,
  dto: MoveLeadStageDto,
): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/${id}/move-stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao mover estágio');
  }
  return res.json() as Promise<Lead>;
}

export async function convertLead(id: string): Promise<Contact> {
  const res = await fetch(`${BASE}/leads/${id}/convert`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao converter lead');
  }
  return res.json() as Promise<Contact>;
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`${BASE}/leads/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao remover lead');
}

// Captura pública (sem auth — para formulários externos)
export async function createPublicLead(
  tenantId: string,
  dto: CreateLeadDto,
): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/public/${tenantId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao registrar lead');
  }
  return res.json() as Promise<Lead>;
}

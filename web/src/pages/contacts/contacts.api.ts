import type {
  Contact,
  ContactsResponse,
  CreateContactDto,
  FilterContactsParams,
  UpdateContactDto,
} from './types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchContacts(
  params: FilterContactsParams = {},
): Promise<ContactsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.company) query.set('company', params.company);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.order) query.set('order', params.order);

  const res = await fetch(`${BASE}/contacts?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao buscar contatos');
  return res.json() as Promise<ContactsResponse>;
}

export async function createContact(dto: CreateContactDto): Promise<Contact> {
  const res = await fetch(`${BASE}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao criar contato');
  }
  return res.json() as Promise<Contact>;
}

export async function updateContact(
  id: string,
  dto: UpdateContactDto,
): Promise<Contact> {
  const res = await fetch(`${BASE}/contacts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao atualizar contato');
  }
  return res.json() as Promise<Contact>;
}

export async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`${BASE}/contacts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erro ao remover contato');
}

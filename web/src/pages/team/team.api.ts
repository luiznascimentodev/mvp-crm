const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: Role;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string };
}

export interface InviteInfo {
  email: string;
  role: Role;
  status: InviteStatus;
  expiresAt: string;
  tenant: { name: string };
  invitedBy: { name: string };
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMembers(): Promise<TeamMember[]> {
  const res = await fetch(`${BASE}/team/members`, { headers: authHeaders() });
  return handleResponse<TeamMember[]>(res);
}

export async function fetchInvites(): Promise<TeamInvite[]> {
  const res = await fetch(`${BASE}/team/invites`, { headers: authHeaders() });
  return handleResponse<TeamInvite[]>(res);
}

export async function sendInvite(dto: {
  email: string;
  role: Role;
}): Promise<TeamInvite> {
  const res = await fetch(`${BASE}/team/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  });
  return handleResponse<TeamInvite>(res);
}

export async function revokeInvite(id: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/team/invites/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<{ message: string }>(res);
}

export async function fetchInviteByToken(token: string): Promise<InviteInfo> {
  const res = await fetch(`${BASE}/team/invite/${token}`);
  return handleResponse<InviteInfo>(res);
}

export async function acceptInvite(
  token: string,
  dto: { name: string; password: string },
): Promise<TeamMember> {
  const res = await fetch(`${BASE}/team/accept/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<TeamMember>(res);
}

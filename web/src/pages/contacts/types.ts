// Tipos locais enquanto o SDK não tem /contacts
// Após regenerar o SDK com `npm run generate:sdk`, trocar por imports do generated/api

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  ownerId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateContactDto {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface UpdateContactDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

export interface FilterContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  company?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

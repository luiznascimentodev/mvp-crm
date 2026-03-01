export type DealStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  PROSPECTING: 'Prospecção',
  QUALIFICATION: 'Qualificação',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negociação',
  CLOSED_WON: 'Ganho',
  CLOSED_LOST: 'Perdido',
};

export const DEAL_STAGES: DealStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
];

export interface Deal {
  id: string;
  tenantId: string;
  ownerId: string;
  contactId: string;
  title: string;
  value: string;
  currency: string;
  stage: DealStage;
  probability: number;
  isActive: boolean;
  notes: string | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DealsResponse {
  data: Deal[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateDealDto {
  title: string;
  contactId: string;
  value?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  notes?: string;
  expectedCloseDate?: string;
}

export interface UpdateDealDto {
  title?: string;
  value?: number;
  currency?: string;
  probability?: number;
  notes?: string;
  expectedCloseDate?: string;
}

export interface MoveStageDealDto {
  stage: DealStage;
}

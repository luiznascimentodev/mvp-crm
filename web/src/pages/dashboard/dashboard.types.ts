export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export const STAGE_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contactado',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

export const STAGE_COLORS: Record<LeadStatus, string> = {
  new: '#6366f1',
  contacted: '#8b5cf6',
  qualified: '#a78bfa',
  proposal: '#f59e0b',
  negotiation: '#f97316',
  won: '#10b981',
  lost: '#ef4444',
};

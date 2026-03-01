export type DealStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export const STAGE_LABELS: Record<DealStage, string> = {
  PROSPECTING: 'Prospecção',
  QUALIFICATION: 'Qualificação',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negociação',
  CLOSED_WON: 'Ganho',
  CLOSED_LOST: 'Perdido',
};

export const STAGE_COLORS: Record<DealStage, string> = {
  PROSPECTING: '#6366f1',
  QUALIFICATION: '#8b5cf6',
  PROPOSAL: '#a78bfa',
  NEGOTIATION: '#f59e0b',
  CLOSED_WON: '#10b981',
  CLOSED_LOST: '#ef4444',
};

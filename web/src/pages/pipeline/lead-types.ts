// ─── Estágios do pipeline de prospecção ─────────────────────────────────────

export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

// Estágios activos no funil (exclui terminais)
export const LEAD_FUNNEL_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
];

// Estágios terminais (finais)
export const LEAD_TERMINAL_STAGES: LeadStage[] = ['won', 'lost'];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'Novos',
  contacted: 'Contatados',
  qualified: 'Qualificados',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Convertidos ✓',
  lost: 'Perdidos',
};

export const LEAD_STAGE_DESCRIPTIONS: Record<LeadStage, string> = {
  new: 'Leads recém-capturados, ainda não contatados',
  contacted: 'Primeiro contato realizado',
  qualified: 'Interesse confirmado, oportunidade validada',
  proposal: 'Proposta comercial enviada',
  negotiation: 'Em processo de negociação e fechamento',
  won: 'Lead convertido em cliente',
  lost: 'Oportunidade perdida',
};

export const LEAD_STAGE_COLORS: Record<
  LeadStage,
  { border: string; bg: string; text: string; dot: string; header: string }
> = {
  new: {
    border: 'border-t-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    header: 'bg-blue-500',
  },
  contacted: {
    border: 'border-t-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
    header: 'bg-violet-500',
  },
  qualified: {
    border: 'border-t-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    header: 'bg-amber-500',
  },
  proposal: {
    border: 'border-t-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    header: 'bg-orange-500',
  },
  negotiation: {
    border: 'border-t-rose-500',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    header: 'bg-rose-500',
  },
  won: {
    border: 'border-t-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    header: 'bg-emerald-500',
  },
  lost: {
    border: 'border-t-slate-400',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    header: 'bg-slate-400',
  },
};

// ── Fontes de leads ──────────────────────────────────────────────────────────

export const LEAD_SOURCES = [
  'website',
  'referral',
  'cold_call',
  'linkedin',
  'event',
  'email_campaign',
  'whatsapp',
  'indication',
  'other',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Site',
  referral: 'Indicação',
  cold_call: 'Cold Call',
  linkedin: 'LinkedIn',
  event: 'Evento',
  email_campaign: 'E-mail Marketing',
  whatsapp: 'WhatsApp',
  indication: 'Referência',
  other: 'Outro',
};

export const LEAD_SOURCE_ICONS: Record<LeadSource, string> = {
  website: '🌐',
  referral: '🤝',
  cold_call: '📞',
  linkedin: '💼',
  event: '🎪',
  email_campaign: '📧',
  whatsapp: '💬',
  indication: '👤',
  other: '❓',
};

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface LeadOwner {
  id: string;
  name: string;
  email: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  ownerId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: LeadSource | null;
  status: LeadStage;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  owner?: LeadOwner | null;
  _count?: { activities: number };
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  status?: LeadStage;
  notes?: string;
}

export interface UpdateLeadDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  status?: LeadStage;
  notes?: string;
}

export interface MoveLeadStageDto {
  status: LeadStage;
}

export interface FilterLeadsDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStage;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

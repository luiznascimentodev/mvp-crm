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

export const LEAD_FUNNEL_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
];

export const LEAD_TERMINAL_STAGES: LeadStage[] = ['won', 'lost'];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'Novos',
  contacted: 'Contatados',
  qualified: 'Qualificados',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Convertidos',
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
  { accent: string; text: string; dot: string; badge: string }
> = {
  new: {
    accent: 'bg-slate-400',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
    badge:
      'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400',
  },
  contacted: {
    accent: 'bg-blue-400',
    text: 'text-blue-600',
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  },
  qualified: {
    accent: 'bg-violet-400',
    text: 'text-violet-600',
    dot: 'bg-violet-400',
    badge:
      'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  },
  proposal: {
    accent: 'bg-amber-400',
    text: 'text-amber-600',
    dot: 'bg-amber-400',
    badge:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  },
  negotiation: {
    accent: 'bg-orange-400',
    text: 'text-orange-600',
    dot: 'bg-orange-400',
    badge:
      'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
  },
  won: {
    accent: 'bg-emerald-500',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    badge:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  lost: {
    accent: 'bg-rose-400',
    text: 'text-rose-500',
    dot: 'bg-rose-400',
    badge: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
  },
};

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

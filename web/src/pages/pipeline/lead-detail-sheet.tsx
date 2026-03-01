import {
  UserCheck,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  Tag,
  AlignLeft,
  Flame,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_STAGE_DESCRIPTIONS,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ICONS,
  type Lead,
} from './lead-types';

function getDaysInStage(updatedAt: string) {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / 86_400_000);
}

function getTemperature(days: number) {
  if (days <= 1) return { label: 'Quente', colorClass: 'text-emerald-500', bg: 'bg-emerald-500' };
  if (days <= 3) return { label: 'Morno', colorClass: 'text-amber-500', bg: 'bg-amber-500' };
  if (days <= 7) return { label: 'Esfriando', colorClass: 'text-orange-500', bg: 'bg-orange-500' };
  return { label: 'Frio', colorClass: 'text-rose-500', bg: 'bg-rose-500' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold select-none shrink-0">
      {initials}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</p>
        {href ? (
          <a
            href={href}
            className="text-sm text-primary hover:underline truncate block"
            target="_blank"
            rel="noreferrer"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

export function LeadDetailSheet({ lead, open, onOpenChange, onEdit, onDelete, onConvert }: Props) {
  if (!lead) return null;

  const stageColors = LEAD_STAGE_COLORS[lead.status] ?? LEAD_STAGE_COLORS['new'];
  const days = getDaysInStage(lead.updatedAt);
  const temp = getTemperature(days);
  const activities = lead._count?.activities ?? 0;
  const isTerminal = lead.status === 'won' || lead.status === 'lost';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden"
      >
        {/* Header colorido conforme o estagio */}
        <SheetHeader
          className={cn(
            'relative p-5 pb-4 bg-gradient-to-br flex-col items-start gap-3',
            stageColors.header,
          )}
        >
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 w-full pr-8">
            <AvatarInitials name={lead.name} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-tight truncate">{lead.name}</h2>
              {lead.company && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <Building2 size={11} />
                  {lead.company}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className={cn('text-xs font-semibold', stageColors.text, stageColors.bg)}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', stageColors.dot)} />
              {LEAD_STAGE_LABELS[lead.status]}
            </Badge>

            {lead.source && (
              <Badge variant="outline" className="text-xs">
                {LEAD_SOURCE_ICONS[lead.source]}{' '}
                {LEAD_SOURCE_LABELS[lead.source]}
              </Badge>
            )}

            <Badge
              variant="outline"
              className={cn('text-xs font-medium flex items-center gap-1', temp.colorClass)}
            >
              <Flame size={10} />
              {temp.label} &bull; {days === 0 ? 'hoje' : `${days}d neste estagio`}
            </Badge>
          </div>
        </SheetHeader>

        {/* Acoes rapidas */}
        <div className="flex gap-2 px-4 py-3 border-b bg-muted/30">
          {!isTerminal && (
            <Button
              size="sm"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
              onClick={() => onConvert(lead)}
            >
              <UserCheck size={14} className="mr-1.5" />
              Converter em Contato
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(lead)}
            className="flex-1"
          >
            <Pencil size={14} className="mr-1.5" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(lead)}
            className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <Trash2 size={14} />
          </Button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Contato */}
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Informacoes de contato
            </p>
            {lead.email && (
              <InfoRow
                icon={<Mail size={14} />}
                label="E-mail"
                value={lead.email}
                href={`mailto:${lead.email}`}
              />
            )}
            {lead.phone && (
              <InfoRow
                icon={<Phone size={14} />}
                label="Telefone"
                value={lead.phone}
                href={`tel:${lead.phone}`}
              />
            )}
            {lead.company && (
              <InfoRow icon={<Building2 size={14} />} label="Empresa" value={lead.company} />
            )}
            {!lead.email && !lead.phone && !lead.company && (
              <p className="text-sm text-muted-foreground italic">Nenhum dado de contato informado.</p>
            )}
          </section>

          <Separator />

          {/* Funil */}
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Funil de prospeccao
            </p>
            <InfoRow
              icon={<Tag size={14} />}
              label="Estagio atual"
              value={
                <span className={cn('font-medium', stageColors.text)}>
                  {LEAD_STAGE_LABELS[lead.status]}
                </span>
              }
            />
            <p className="text-xs text-muted-foreground ml-7">
              {LEAD_STAGE_DESCRIPTIONS[lead.status]}
            </p>
            {lead.source && (
              <InfoRow
                icon={<span className="text-sm">{LEAD_SOURCE_ICONS[lead.source]}</span>}
                label="Origem"
                value={LEAD_SOURCE_LABELS[lead.source]}
              />
            )}
          </section>

          <Separator />

          {/* Notas */}
          {lead.notes && (
            <>
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Notas
                </p>
                <div className="flex gap-3">
                  <AlignLeft size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">{lead.notes}</p>
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Atividades */}
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Atividades
            </p>
            <InfoRow
              icon={<Calendar size={14} />}
              label="Total de atividades"
              value={
                activities > 0
                  ? `${activities} atividade${activities > 1 ? 's' : ''} registrada${activities > 1 ? 's' : ''}`
                  : 'Nenhuma atividade ainda'
              }
            />
          </section>

          <Separator />

          {/* Proprietario */}
          {lead.owner && (
            <>
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Responsavel
                </p>
                <div className="flex items-center gap-3">
                  <AvatarInitials name={lead.owner.name} />
                  <div>
                    <p className="text-sm font-medium">{lead.owner.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.owner.email}</p>
                  </div>
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Datas */}
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Cronologia
            </p>
            <InfoRow
              icon={<Calendar size={14} />}
              label="Criado em"
              value={formatDate(lead.createdAt)}
            />
            <InfoRow
              icon={<Clock size={14} />}
              label="Ultima atualizacao"
              value={formatDateTime(lead.updatedAt)}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_STAGE_DESCRIPTIONS,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ICONS,
  type Lead,
} from './lead-types';

function buildDaysInStage(updatedAt: string) {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

function buildTemperatureLabel(days: number) {
  if (days <= 1) return 'Quente';
  if (days <= 3) return 'Morno';
  if (days <= 7) return 'Esfriando';
  return 'Frio';
}

function buildTemperatureClass(days: number) {
  if (days <= 1) return 'text-primary';
  if (days <= 3) return 'text-primary/70';
  if (days <= 7) return 'text-muted-foreground';
  return 'text-muted-foreground/50';
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
    .map((part) => part[0])
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
      <span className="mt-0.5 text-muted-foreground/60 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
          {label}
        </p>
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

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

export function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onConvert,
}: LeadDetailSheetProps) {
  if (!lead) return null;

  const colors = LEAD_STAGE_COLORS[lead.status] ?? LEAD_STAGE_COLORS['new'];
  const days = buildDaysInStage(lead.updatedAt);
  const temperatureLabel = buildTemperatureLabel(days);
  const temperatureClass = buildTemperatureClass(days);
  const activities = lead._count?.activities ?? 0;
  const isTerminal = lead.status === 'won' || lead.status === 'lost';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden"
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3 pr-8 min-w-0 flex-1">
            <AvatarInitials name={lead.name} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold leading-tight truncate">
                {lead.name}
              </h2>
              {lead.company && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <Building2 size={10} />
                  {lead.company}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full',
                    colors.badge,
                  )}
                >
                  <span
                    className={cn('w-1.5 h-1.5 rounded-full', colors.dot)}
                  />
                  {LEAD_STAGE_LABELS[lead.status]}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-medium',
                    temperatureClass,
                  )}
                >
                  <Flame size={10} />
                  {temperatureLabel}
                  {days > 0 && (
                    <span className="text-muted-foreground/50 font-normal">
                      {' '}
                      Â· {days}d
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex gap-2 px-4 py-3 border-b border-border/40 bg-muted/20">
          {!isTerminal && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => onConvert(lead)}
            >
              <UserCheck size={13} />
              Converter
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => onEdit(lead)}
          >
            <Pencil size={13} />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
            onClick={() => onDelete(lead)}
          >
            <Trash2 size={13} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto orbit-scroll p-4 space-y-5">
          <section className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              InformaÃ§Ãµes de contato
            </p>
            {lead.email && (
              <InfoRow
                icon={<Mail size={13} />}
                label="E-mail"
                value={lead.email}
                href={`mailto:${lead.email}`}
              />
            )}
            {lead.phone && (
              <InfoRow
                icon={<Phone size={13} />}
                label="Telefone"
                value={lead.phone}
                href={`tel:${lead.phone}`}
              />
            )}
            {lead.company && (
              <InfoRow
                icon={<Building2 size={13} />}
                label="Empresa"
                value={lead.company}
              />
            )}
            {!lead.email && !lead.phone && !lead.company && (
              <p className="text-sm text-muted-foreground/60 italic">
                Nenhum dado de contato informado.
              </p>
            )}
          </section>

          <Separator className="opacity-50" />

          <section className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Funil de prospecÃ§Ã£o
            </p>
            <InfoRow
              icon={<Tag size={13} />}
              label="EstÃ¡gio atual"
              value={
                <span className={cn('font-medium', colors.text)}>
                  {LEAD_STAGE_LABELS[lead.status]}
                </span>
              }
            />
            <p className="text-xs text-muted-foreground/70 ml-7">
              {LEAD_STAGE_DESCRIPTIONS[lead.status]}
            </p>
            {lead.source && (
              <InfoRow
                icon={
                  <span className="text-sm leading-none">
                    {LEAD_SOURCE_ICONS[lead.source]}
                  </span>
                }
                label="Origem"
                value={LEAD_SOURCE_LABELS[lead.source]}
              />
            )}
          </section>

          {lead.notes && (
            <>
              <Separator className="opacity-50" />
              <section className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Notas
                </p>
                <div className="flex gap-3">
                  <AlignLeft
                    size={13}
                    className="text-muted-foreground/60 mt-0.5 shrink-0"
                  />
                  <p className="text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed">
                    {lead.notes}
                  </p>
                </div>
              </section>
            </>
          )}

          <Separator className="opacity-50" />

          <section className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Atividades
            </p>
            <InfoRow
              icon={<Calendar size={13} />}
              label="Total de atividades"
              value={
                activities > 0
                  ? `${activities} atividade${activities > 1 ? 's' : ''} registrada${activities > 1 ? 's' : ''}`
                  : 'Nenhuma atividade ainda'
              }
            />
          </section>

          {lead.owner && (
            <>
              <Separator className="opacity-50" />
              <section className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  ResponsÃ¡vel
                </p>
                <div className="flex items-center gap-3">
                  <AvatarInitials name={lead.owner.name} />
                  <div>
                    <p className="text-sm font-medium">{lead.owner.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.owner.email}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}

          <Separator className="opacity-50" />

          <section className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Cronologia
            </p>
            <InfoRow
              icon={<Calendar size={13} />}
              label="Criado em"
              value={formatDate(lead.createdAt)}
            />
            <InfoRow
              icon={<Clock size={13} />}
              label="Ãšltima atualizaÃ§Ã£o"
              value={formatDateTime(lead.updatedAt)}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

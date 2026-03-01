import { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  Pencil,
  Trash2,
  UserCheck,
  Clock,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ICONS,
  type Lead,
} from './lead-types';

interface Props {
  lead: Lead;
  isDragging?: boolean;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function getDaysInStage(updatedAt: string) {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

function getTempConfig(days: number) {
  if (days <= 1) return { bar: 'bg-emerald-400', label: 'Quente', sub: 'Atualizado recentemente' };
  if (days <= 3) return { bar: 'bg-amber-400', label: `${days}d no estágio`, sub: 'Morno' };
  if (days <= 7) return { bar: 'bg-orange-500', label: `${days}d no estágio`, sub: 'Esfriando' };
  return { bar: 'bg-rose-500', label: `${days}d no estágio`, sub: 'Frio — precisa de atenção' };
}

export function LeadCard({
  lead,
  isDragging = false,
  onOpen,
  onEdit,
  onDelete,
  onConvert,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const days = getDaysInStage(lead.updatedAt);
  const temp = getTempConfig(days);
  const activityCount = lead._count?.activities ?? 0;

  return (
    <div
      className={cn(
        'relative bg-card rounded-xl border select-none overflow-hidden',
        'transition-shadow duration-150',
        isDragging
          ? 'shadow-2xl border-primary/30 ring-2 ring-primary/20'
          : 'border-border/50 shadow-sm hover:shadow-md hover:border-border/80',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (!isDragging) onOpen(lead); }}
    >
      {/* Barra de temperatura lateral */}
      <div className={cn('absolute left-0 inset-y-0 w-[3px]', temp.bar)} />

      <div className="p-3 pl-4 space-y-2.5">
        {/* Header: nome + avatar */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-[13px] leading-snug line-clamp-2 flex-1 text-foreground">
            {lead.name}
          </p>
          {lead.owner && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center shrink-0 ring-1 ring-border/50 cursor-default">
                  {getInitials(lead.owner.name)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">{lead.owner.name}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Empresa */}
        {lead.company && (
          <div className="flex items-center gap-1.5">
            <Building2 size={11} className="text-muted-foreground/60 shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{lead.company}</span>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {lead.source && (
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5 gap-1 font-normal bg-muted/50 border-0">
                <span className="text-[11px]">{LEAD_SOURCE_ICONS[lead.source]}</span>
                {LEAD_SOURCE_LABELS[lead.source]}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activityCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 cursor-default">
                    <Activity size={9} />{activityCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {activityCount} atividade{activityCount !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 cursor-default">
                  <Clock size={9} />
                  {days === 0 ? 'hoje' : `${days}d`}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {temp.label} — {temp.sub}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Ações no hover */}
        <div
          className={cn(
            'flex items-center gap-0.5 pt-1.5 border-t border-border/30',
            'transition-all duration-150 overflow-hidden',
            hovered && !isDragging ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0',
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {lead.phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={`tel:${lead.phone}`} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Phone size={11} />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{lead.phone}</TooltipContent>
            </Tooltip>
          )}
          {lead.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={`mailto:${lead.email}`} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Mail size={11} />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{lead.email}</TooltipContent>
            </Tooltip>
          )}
          <span className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={(e) => { e.stopPropagation(); onConvert(lead); }}>
                <UserCheck size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Converter em contato</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); onEdit(lead); }}>
                <Pencil size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete(lead); }}>
                <Trash2 size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Remover</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); onOpen(lead); }}>
                <ChevronRight size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Ver detalhes</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

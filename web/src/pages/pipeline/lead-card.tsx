import { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  Pencil,
  Trash2,
  UserCheck,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LEAD_SOURCE_LABELS, LEAD_SOURCE_ICONS, type Lead } from './lead-types';

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

function buildInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function buildDaysInStage(updatedAt: string) {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

function buildTemperatureAccent(days: number) {
  if (days <= 1) return 'bg-primary';
  if (days <= 3) return 'bg-primary/60';
  if (days <= 7) return 'bg-zinc-400';
  return 'bg-zinc-300';
}

function buildTemperatureLabel(days: number) {
  if (days === 0) return 'hoje';
  return `${days}d`;
}

export function LeadCard({
  lead,
  isDragging = false,
  onOpen,
  onEdit,
  onDelete,
  onConvert,
}: LeadCardProps) {
  const [hovered, setHovered] = useState(false);
  const days = buildDaysInStage(lead.updatedAt);
  const accentColor = buildTemperatureAccent(days);
  const activityCount = lead._count?.activities ?? 0;

  return (
    <div
      className={cn(
        'relative bg-card rounded-xl border select-none overflow-hidden cursor-pointer',
        'transition-all duration-150',
        isDragging
          ? 'shadow-2xl border-primary/40 ring-1 ring-primary/20 rotate-1'
          : 'border-border/60 shadow-none hover:border-border hover:shadow-sm',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (!isDragging) onOpen(lead);
      }}
    >
      <div
        className={cn(
          'absolute left-0 inset-y-0 w-[2px] rounded-l-xl',
          accentColor,
        )}
      />

      <div className="px-3.5 pt-3 pb-2.5 pl-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-[13px] leading-snug line-clamp-2 flex-1 text-foreground">
            {lead.name}
          </p>
          {lead.owner && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 cursor-default">
                  {buildInitials(lead.owner.name)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {lead.owner.name}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {lead.company && (
          <div className="flex items-center gap-1.5">
            <Building2
              size={10}
              className="text-muted-foreground/50 shrink-0"
            />
            <span className="text-xs text-muted-foreground truncate">
              {lead.company}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {lead.source ? (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <span>{LEAD_SOURCE_ICONS[lead.source]}</span>
              {LEAD_SOURCE_LABELS[lead.source]}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 shrink-0">
            {activityCount > 0 && <span>{activityCount} ativ.</span>}
            <span className="flex items-center gap-0.5">
              <Clock size={9} />
              {buildTemperatureLabel(days)}
            </span>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-0.5 pt-2 border-t border-border/30',
            'transition-all duration-150 overflow-hidden',
            hovered && !isDragging
              ? 'opacity-100 max-h-8'
              : 'opacity-0 max-h-0',
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {lead.phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`tel:${lead.phone}`}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone size={11} />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {lead.phone}
              </TooltipContent>
            </Tooltip>
          )}
          {lead.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`mailto:${lead.email}`}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail size={11} />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {lead.email}
              </TooltipContent>
            </Tooltip>
          )}

          <span className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-primary/70 hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onConvert(lead);
                }}
              >
                <UserCheck size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Converter em contato
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(lead);
                }}
              >
                <Pencil size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Editar
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(lead);
                }}
              >
                <Trash2 size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Remover
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(lead);
                }}
              >
                <ChevronRight size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Ver detalhes
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

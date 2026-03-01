import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  Loader2,
  Search,
  X,
  Trophy,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/use-socket';
import { fetchLeads, createLead, updateLead, moveLead, deleteLead, convertLead } from './leads.api';
import {
  LEAD_FUNNEL_STAGES,
  LEAD_TERMINAL_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_STAGE_DESCRIPTIONS,
  type Lead,
  type LeadStage,
  type CreateLeadDto,
} from './lead-types';
import { LeadCard } from './lead-card';
import { LeadFormDialog } from './lead-form-dialog';
import { LeadDetailSheet } from './lead-detail-sheet';

// ---------------------------------------------------------------------------
// Kanban Column
// ---------------------------------------------------------------------------
interface ColumnProps {
  stage: LeadStage;
  leads: Lead[];
  onAdd: (stage: LeadStage) => void;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

function KanbanColumn({ stage, leads, onAdd, onOpen, onEdit, onDelete, onConvert }: ColumnProps) {
  const c = LEAD_STAGE_COLORS[stage];

  return (
    <div className="flex flex-col w-[270px] shrink-0">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 border-t-2',
        c.bg, c.border,
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn('text-[11px] font-semibold uppercase tracking-widest truncate cursor-default', c.text)}>
                {LEAD_STAGE_LABELS[stage]}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
              {LEAD_STAGE_DESCRIPTIONS[stage]}
            </TooltipContent>
          </Tooltip>
          <span className={cn('text-[10px] font-bold tabular-nums opacity-50', c.text)}>{leads.length}</span>
        </div>
        <Button
          size="icon" variant="ghost"
          className={cn('w-5 h-5 shrink-0 opacity-40 hover:opacity-100', c.text)}
          onClick={() => onAdd(stage)}
        >
          <PlusCircle size={13} />
        </Button>
      </div>

      {/* Droppable zone */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 min-h-[140px] rounded-b-xl border border-t-0 p-2 space-y-2 transition-colors duration-150',
              snapshot.isDraggingOver
                ? 'bg-primary/[0.04] border-primary/25'
                : 'bg-muted/20 border-border/40',
            )}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    style={dragProvided.draggableProps.style}
                    className={cn(
                      'rounded-xl',
                      dragSnapshot.isDragging && 'shadow-2xl',
                    )}
                  >
                    <LeadCard
                      lead={lead}
                      isDragging={dragSnapshot.isDragging}
                      onOpen={onOpen}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onConvert={onConvert}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {leads.length === 0 && !snapshot.isDraggingOver && (
              <button
                onClick={() => onAdd(stage)}
                className="w-full h-14 border border-dashed border-border/40 rounded-lg text-muted-foreground/40 text-[11px] hover:border-border/60 hover:text-muted-foreground/60 transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle size={12} />
                Adicionar lead
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Terminal Column
// ---------------------------------------------------------------------------
function TerminalColumn({ stage, leads }: { stage: 'won' | 'lost'; leads: Lead[] }) {
  const c = LEAD_STAGE_COLORS[stage];
  const Icon = stage === 'won' ? Trophy : XCircle;

  return (
    <div className="flex flex-col w-52 shrink-0">
      <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-t-xl border border-b-0 border-t-2', c.bg, c.border)}>
        <Icon size={12} className={cn(c.text, 'opacity-70')} />
        <span className={cn('text-[11px] font-semibold uppercase tracking-widest flex-1', c.text)}>
          {LEAD_STAGE_LABELS[stage]}
        </span>
        <span className={cn('text-[10px] font-bold opacity-50', c.text)}>{leads.length}</span>
      </div>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 min-h-[80px] rounded-b-xl border border-t-0 p-2 space-y-1.5 transition-colors duration-150',
              snapshot.isDraggingOver
                ? 'bg-primary/[0.04] border-primary/25'
                : 'bg-muted/20 border-border/40',
            )}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    style={dragProvided.draggableProps.style}
                    className={cn('text-xs px-2.5 py-1.5 rounded-lg truncate font-medium border cursor-grab', c.bg, c.border, c.text)}
                  >
                    {lead.name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-[10px] text-muted-foreground/30 text-center py-4 italic">Arraste para cá</p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
function StatsRow({ leads }: { leads: Lead[] }) {
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost').length;
  const active = leads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span><span className="font-semibold text-foreground tabular-nums">{leads.length}</span> leads</span>
      <span className="text-border/60">·</span>
      <span><span className="font-semibold text-foreground tabular-nums">{active}</span> ativos</span>
      {won > 0 && <span className="text-emerald-600 font-medium">{won} ganho{won !== 1 ? 's' : ''}</span>}
      {lost > 0 && <span className="text-rose-500 font-medium">{lost} perdido{lost !== 1 ? 's' : ''}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline Page
// ---------------------------------------------------------------------------
export function PipelinePage() {
  const qc = useQueryClient();
  const { isConnected, onLeadUpdated } = useSocket();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultStage, setFormDefaultStage] = useState<LeadStage>('new');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => fetchLeads({ limit: 500 }),
    staleTime: 30_000,
  });
  const allLeads: Lead[] = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    const unsub = onLeadUpdated(() => void qc.invalidateQueries({ queryKey: ['leads'] }));
    return unsub;
  }, [onLeadUpdated, qc]);

  const createMut = useMutation({
    mutationFn: createLead,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead criado!'); setFormOpen(false); },
    onError: () => toast.error('Erro ao criar lead.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateLeadDto }) => updateLead(id, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead atualizado!'); setFormOpen(false); setEditingLead(null); },
    onError: () => toast.error('Erro ao atualizar lead.'),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) => moveLead(id, { status: stage }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const prev = qc.getQueryData(['leads']);
      qc.setQueryData(['leads'], (old: typeof data) => {
        if (!old) return old;
        return { ...old, data: old.data.map((l: Lead) => l.id === id ? { ...l, status: stage } : l) };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev); toast.error('Erro ao mover lead.'); },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead removido.'); },
    onError: () => toast.error('Erro ao remover lead.'),
  });

  const convertMut = useMutation({
    mutationFn: convertLead,
    onSuccess: (contact) => {
      void qc.invalidateQueries({ queryKey: ['leads'] });
      void qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`Convertido: ${contact.name}`);
      setDetailOpen(false);
    },
    onError: () => toast.error('Erro ao converter lead.'),
  });

  const handleDragEnd = ({ source, destination, draggableId }: DropResult) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const newStage = destination.droppableId as LeadStage;
    moveMut.mutate({ id: draggableId, stage: newStage });
  };

  const handleAddInStage = (stage: LeadStage) => { setEditingLead(null); setFormDefaultStage(stage); setFormOpen(true); };
  const handleEdit = (lead: Lead) => { setEditingLead(lead); setFormOpen(true); };
  const handleDelete = (lead: Lead) => { if (!confirm(`Remover "${lead.name}"?`)) return; deleteMut.mutate(lead.id); };
  const handleConvert = (lead: Lead) => { if (!confirm(`Converter "${lead.name}" em contato?`)) return; convertMut.mutate(lead.id); };
  const handleOpen = (lead: Lead) => { setDetailLead(lead); setDetailOpen(true); };

  const handleFormSubmit = useCallback(async (dto: CreateLeadDto) => {
    if (editingLead) await updateMut.mutateAsync({ id: editingLead.id, data: dto });
    else await createMut.mutateAsync(dto);
  }, [editingLead, updateMut, createMut]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() =>
    q ? allLeads.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.company ?? '').toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q)
    ) : allLeads,
  [allLeads, q]);

  const leadsBy = (stage: LeadStage) => filtered.filter((l) => l.status === stage);

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 gap-4">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Pipeline de Prospecção</h1>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {allLeads.length > 0 ? <StatsRow leads={allLeads} /> : 'Sem leads ainda — crie o primeiro'}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">
                {isConnected
                  ? <Wifi size={12} className="text-emerald-500" />
                  : <WifiOff size={12} className="text-muted-foreground/30" />}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isConnected ? 'Tempo real ativo' : 'Sem conexão em tempo real'}
            </TooltipContent>
          </Tooltip>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
            <Input
              className="pl-7 pr-6 h-8 w-48 text-xs bg-muted/30 border-border/40 focus:bg-background"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>

          <Button size="sm" className="h-8 text-xs gap-1.5 font-medium" onClick={() => handleAddInStage('new')}>
            <PlusCircle size={13} />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-muted-foreground/30" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="flex gap-3 p-5 min-w-max items-start">

              {LEAD_FUNNEL_STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  leads={leadsBy(stage)}
                  onAdd={handleAddInStage}
                  onOpen={handleOpen}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onConvert={handleConvert}
                />
              ))}

              <div className="self-stretch w-px bg-border/25 mx-1" />

              {LEAD_TERMINAL_STAGES.map((stage) => (
                <TerminalColumn key={stage} stage={stage as 'won' | 'lost'} leads={leadsBy(stage)} />
              ))}

            </div>
          </div>
        </DragDropContext>
      )}

      <LeadFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingLead(null); }}
        lead={editingLead}
        defaultStage={formDefaultStage}
        onSubmit={handleFormSubmit}
        loading={createMut.isPending || updateMut.isPending}
      />

      <LeadDetailSheet
        lead={detailLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(l) => { setDetailOpen(false); handleEdit(l); }}
        onDelete={(l) => { setDetailOpen(false); handleDelete(l); }}
        onConvert={handleConvert}
      />
    </div>
  );
}

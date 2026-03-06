import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/use-socket';
import {
  fetchLeads,
  createLead,
  updateLead,
  moveLead,
  deleteLead,
  convertLead,
} from './leads.api';
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

const EDGE_ZONE = 120;
const MAX_SPEED = 18;

function useEdgeScroll(ref: React.RefObject<HTMLElement | null>) {
  const frameRef = useRef<number | null>(null);
  const velocityRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onMouseMove(event: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const width = rect.width;

      if (x < EDGE_ZONE) {
        velocityRef.current = -MAX_SPEED * (1 - x / EDGE_ZONE);
      } else if (x > width - EDGE_ZONE) {
        velocityRef.current = MAX_SPEED * (1 - (width - x) / EDGE_ZONE);
      } else {
        velocityRef.current = 0;
      }
    }

    function onMouseLeave() {
      velocityRef.current = 0;
    }

    function tick() {
      if (velocityRef.current !== 0) {
        el!.scrollLeft += velocityRef.current;
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [ref]);
}

interface KanbanColumnProps {
  stage: LeadStage;
  leads: Lead[];
  onAdd: (stage: LeadStage) => void;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

function KanbanColumn({
  stage,
  leads,
  onAdd,
  onOpen,
  onEdit,
  onDelete,
  onConvert,
}: KanbanColumnProps) {
  const colors = LEAD_STAGE_COLORS[stage];

  return (
    <div className="flex flex-col w-[260px] shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 mb-1">
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide cursor-default">
                {LEAD_STAGE_LABELS[stage]}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {LEAD_STAGE_DESCRIPTIONS[stage]}
            </TooltipContent>
          </Tooltip>
          <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
            {leads.length}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="w-5 h-5 text-muted-foreground/40 hover:text-foreground hover:bg-muted"
          onClick={() => onAdd(stage)}
        >
          <PlusCircle size={12} />
        </Button>
      </div>

      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 min-h-[120px] rounded-xl border p-2 space-y-1.5 transition-colors duration-150',
              snapshot.isDraggingOver
                ? 'bg-primary/5 border-primary/20'
                : 'bg-muted/30 border-border/40',
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
                className="w-full h-12 border border-dashed border-border/30 rounded-lg text-muted-foreground/30 text-[11px] hover:border-border/50 hover:text-muted-foreground/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle size={11} />
                Adicionar
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function TerminalColumn({
  stage,
  leads,
}: {
  stage: 'won' | 'lost';
  leads: Lead[];
}) {
  const colors = LEAD_STAGE_COLORS[stage];
  const Icon = stage === 'won' ? Trophy : XCircle;

  return (
    <div className="flex flex-col w-48 shrink-0">
      <div className="flex items-center gap-2 px-3 py-2.5 mb-1">
        <div className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
        <Icon size={11} className={cn(colors.text, 'opacity-60')} />
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide flex-1">
          {LEAD_STAGE_LABELS[stage]}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
          {leads.length}
        </span>
      </div>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 min-h-[80px] rounded-xl border p-2 space-y-1 transition-colors duration-150',
              snapshot.isDraggingOver
                ? 'bg-primary/5 border-primary/20'
                : 'bg-muted/20 border-border/30',
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
                    className={cn(
                      'text-xs px-2.5 py-1.5 rounded-lg truncate font-medium border cursor-grab',
                      colors.badge,
                      'border-border/30',
                    )}
                  >
                    {lead.name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-[10px] text-muted-foreground/25 text-center py-4">
                Arraste para cá
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function PipelineStats({ leads }: { leads: Lead[] }) {
  const won = leads.filter((lead) => lead.status === 'won').length;
  const lost = leads.filter((lead) => lead.status === 'lost').length;
  const active = leads.filter(
    (lead) => lead.status !== 'won' && lead.status !== 'lost',
  ).length;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span>
        <span className="font-semibold text-foreground tabular-nums">
          {leads.length}
        </span>{' '}
        leads
      </span>
      <span className="text-border">·</span>
      <span>
        <span className="font-semibold text-foreground tabular-nums">
          {active}
        </span>{' '}
        ativos
      </span>
      {won > 0 && (
        <span className="text-primary font-medium">
          {won} ganho{won !== 1 ? 's' : ''}
        </span>
      )}
      {lost > 0 && (
        <span className="text-muted-foreground/60">
          {lost} perdido{lost !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function ScrollButton({
  direction,
  onClick,
  visible,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  visible: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center',
        'w-7 h-14 rounded-lg bg-background/80 border border-border/50 backdrop-blur-sm',
        'text-muted-foreground hover:text-foreground hover:bg-background hover:border-border',
        'shadow-sm transition-all duration-200',
        direction === 'left' ? 'left-2' : 'right-2',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {direction === 'left' ? (
        <ChevronLeft size={14} />
      ) : (
        <ChevronRight size={14} />
      )}
    </button>
  );
}

export function PipelinePage() {
  const queryClient = useQueryClient();
  const { isConnected, onLeadUpdated } = useSocket();
  const boardRef = useRef<HTMLDivElement>(null);

  useEdgeScroll(boardRef);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultStage, setFormDefaultStage] = useState<LeadStage>('new');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => fetchLeads({ limit: 500 }),
    staleTime: 30_000,
  });
  const allLeads: Lead[] = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    const unsubscribe = onLeadUpdated(
      () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
    );
    return unsubscribe;
  }, [onLeadUpdated, queryClient]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    function updateScrollState() {
      setCanScrollLeft(el!.scrollLeft > 8);
      setCanScrollRight(el!.scrollLeft < el!.scrollWidth - el!.clientWidth - 8);
    }

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [isLoading]);

  function scrollBoard(direction: 'left' | 'right') {
    boardRef.current?.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  }

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead criado!');
      setFormOpen(false);
    },
    onError: () => toast.error('Erro ao criar lead.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateLeadDto }) =>
      updateLead(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado!');
      setFormOpen(false);
      setEditingLead(null);
    },
    onError: () => toast.error('Erro ao atualizar lead.'),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) =>
      moveLead(id, { status: stage }),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const previous = queryClient.getQueryData(['leads']);
      queryClient.setQueryData(['leads'], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((lead: Lead) =>
            lead.id === id ? { ...lead, status: stage } : lead,
          ),
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous)
        queryClient.setQueryData(['leads'], context.previous);
      toast.error('Erro ao mover lead.');
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead removido.');
    },
    onError: () => toast.error('Erro ao remover lead.'),
  });

  const convertMutation = useMutation({
    mutationFn: convertLead,
    onSuccess: (contact) => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`Convertido: ${contact.name}`);
      setDetailOpen(false);
    },
    onError: () => toast.error('Erro ao converter lead.'),
  });

  function handleDragEnd({ source, destination, draggableId }: DropResult) {
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;
    moveMutation.mutate({
      id: draggableId,
      stage: destination.droppableId as LeadStage,
    });
  }

  function handleAddInStage(stage: LeadStage) {
    setEditingLead(null);
    setFormDefaultStage(stage);
    setFormOpen(true);
  }

  function handleEdit(lead: Lead) {
    setEditingLead(lead);
    setFormOpen(true);
  }

  function handleDelete(lead: Lead) {
    if (!confirm(`Remover "${lead.name}"?`)) return;
    deleteMutation.mutate(lead.id);
  }

  function handleConvert(lead: Lead) {
    if (!confirm(`Converter "${lead.name}" em contato?`)) return;
    convertMutation.mutate(lead.id);
  }

  function handleOpen(lead: Lead) {
    setDetailLead(lead);
    setDetailOpen(true);
  }

  const handleFormSubmit = useCallback(
    async (dto: CreateLeadDto) => {
      if (editingLead) {
        await updateMutation.mutateAsync({ id: editingLead.id, dto });
      } else {
        await createMutation.mutateAsync(dto);
      }
    },
    [editingLead, updateMutation, createMutation],
  );

  const searchQuery = search.trim().toLowerCase();
  const filteredLeads = useMemo(
    () =>
      searchQuery
        ? allLeads.filter(
            (lead) =>
              lead.name.toLowerCase().includes(searchQuery) ||
              (lead.company ?? '').toLowerCase().includes(searchQuery) ||
              (lead.email ?? '').toLowerCase().includes(searchQuery),
          )
        : allLeads,
    [allLeads, searchQuery],
  );

  function leadsForStage(stage: LeadStage) {
    return filteredLeads.filter((lead) => lead.status === stage);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 gap-4">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Pipeline de Prospecção
          </h1>
          <div className="mt-0.5">
            {allLeads.length > 0 ? (
              <PipelineStats leads={allLeads} />
            ) : (
              <span className="text-xs text-muted-foreground">
                Nenhum lead ainda — crie o primeiro
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default flex items-center">
                {isConnected ? (
                  <Wifi size={12} className="text-primary" />
                ) : (
                  <WifiOff size={12} className="text-muted-foreground/30" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isConnected ? 'Tempo real ativo' : 'Sem conexão em tempo real'}
            </TooltipContent>
          </Tooltip>

          <div className="relative">
            <Search
              size={11}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none"
            />
            <Input
              className="pl-7 pr-6 h-8 w-44 text-xs bg-muted/30 border-border/40"
              placeholder="Buscar lead..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 font-medium"
            onClick={() => handleAddInStage('new')}
          >
            <PlusCircle size={12} />
            Novo Lead
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2
            size={20}
            className="animate-spin text-muted-foreground/30"
          />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 relative overflow-hidden">
            <ScrollButton
              direction="left"
              onClick={() => scrollBoard('left')}
              visible={canScrollLeft}
            />
            <ScrollButton
              direction="right"
              onClick={() => scrollBoard('right')}
              visible={canScrollRight}
            />

            <div
              ref={boardRef}
              className="h-full overflow-x-auto overflow-y-hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex gap-2 p-5 min-w-max items-start">
                {LEAD_FUNNEL_STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    leads={leadsForStage(stage)}
                    onAdd={handleAddInStage}
                    onOpen={handleOpen}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onConvert={handleConvert}
                  />
                ))}

                <div className="self-stretch w-px bg-border/20 mx-2" />

                {LEAD_TERMINAL_STAGES.map((stage) => (
                  <TerminalColumn
                    key={stage}
                    stage={stage as 'won' | 'lost'}
                    leads={leadsForStage(stage)}
                  />
                ))}
              </div>
            </div>
          </div>
        </DragDropContext>
      )}

      <LeadFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLead(null);
        }}
        lead={editingLead}
        defaultStage={formDefaultStage}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <LeadDetailSheet
        lead={detailLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(lead) => {
          setDetailOpen(false);
          handleEdit(lead);
        }}
        onDelete={(lead) => {
          setDetailOpen(false);
          handleDelete(lead);
        }}
        onConvert={handleConvert}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/use-socket';
import {
  createDeal,
  deleteDeal,
  fetchDeals,
  moveDealStage,
  updateDeal,
} from './deals.api';
import { DealCard } from './deal-card';
import { DealFormDialog } from './deal-form-dialog';
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type CreateDealDto,
  type Deal,
  type DealStage,
  type UpdateDealDto,
} from './types';

// ─── Droppable column ─────────────────────────────────────────────────────────
interface KanbanColumnProps {
  stage: DealStage;
  deals: Deal[];
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
}

function KanbanColumn({ stage, deals, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
  }).format(totalValue);

  const stageColors: Record<DealStage, string> = {
    PROSPECTING: 'border-t-blue-400',
    QUALIFICATION: 'border-t-purple-400',
    PROPOSAL: 'border-t-yellow-400',
    NEGOTIATION: 'border-t-orange-400',
    CLOSED_WON: 'border-t-green-500',
    CLOSED_LOST: 'border-t-red-400',
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-gray-50 rounded-lg border-t-4 ${stageColors[stage]} min-h-[500px] w-64 flex-shrink-0 transition-colors ${isOver ? 'bg-blue-50' : ''}`}
    >
      <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            {DEAL_STAGE_LABELS[stage]}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {deals.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-gray-500 mt-1">{formattedTotal}</p>
        )}
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// ─── Pipeline Page ─────────────────────────────────────────────────────────────
export function PipelinePage() {
  const queryClient = useQueryClient();
  const { isConnected, onDealUpdated, onDealCreated, onDealDeleted } =
    useSocket();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [activeDrag, setActiveDrag] = useState<Deal | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => fetchDeals({ limit: 200 }),
  });

  const deals = useMemo(() => data?.data ?? [], [data]);

  // Agrupar deals por estágio
  const dealsByStage = useMemo<Record<DealStage, Deal[]>>(() => {
    const map = {} as Record<DealStage, Deal[]>;
    for (const stage of DEAL_STAGES) {
      map[stage] = deals.filter((d) => d.stage === stage);
    }
    return map;
  }, [deals]);

  // ─── WebSocket sync ────────────────────────────────────────────────────────
  const invalidate = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: ['deals'] }),
    [queryClient],
  );

  useEffect(() => {
    const offUpdated = onDealUpdated(invalidate);
    const offCreated = onDealCreated(invalidate);
    const offDeleted = onDealDeleted(invalidate);
    return () => {
      offUpdated();
      offCreated();
      offDeleted();
    };
  }, [onDealUpdated, onDealCreated, onDealDeleted, invalidate]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (dto: CreateDealDto) => createDeal(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      setDialogOpen(false);
      toast.success('Deal criado com sucesso!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDealDto }) =>
      updateDeal(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      setDialogOpen(false);
      setEditingDeal(null);
      toast.success('Deal atualizado!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      moveDealStage(id, { stage }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['deals'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal removido.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── DnD handlers ─────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDrag(deal ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const draggedDeal = deals.find((d) => d.id === active.id);
    if (!draggedDeal) return;

    // Verificar se foi solto em outra coluna (stage)
    const targetStage = DEAL_STAGES.includes(over.id as DealStage)
      ? (over.id as DealStage)
      : deals.find((d) => d.id === over.id)?.stage;

    if (targetStage && targetStage !== draggedDeal.stage) {
      moveStageMutation.mutate({ id: draggedDeal.id, stage: targetStage });
    }
  };

  // ─── Form handlers ─────────────────────────────────────────────────────────
  const handleFormSubmit = async (dto: CreateDealDto) => {
    if (editingDeal) {
      await updateMutation.mutateAsync({ id: editingDeal.id, dto });
    } else {
      await createMutation.mutateAsync(dto);
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Remover este deal?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewDeal = () => {
    setEditingDeal(null);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} deals ativos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-600' : 'text-gray-400'}`}
            title={
              isConnected
                ? 'Sincronização em tempo real ativa'
                : 'Sem conexão em tempo real'
            }
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? 'Ao vivo' : 'Offline'}
          </span>
          <Button onClick={handleNewDeal} className="gap-2">
            <PlusCircle size={16} />
            Novo Deal
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Carregando pipeline...</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {DEAL_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                deals={dealsByStage[stage]}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDrag ? (
              <DealCard
                deal={activeDrag}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Dialog */}
      <DealFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingDeal(null);
        }}
        deal={editingDeal}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Deal } from './types';

interface DealCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
}

export function DealCard({ deal, onEdit, onDelete }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: deal.currency || 'BRL',
  }).format(Number(deal.value));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Arrastar"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {deal.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{formattedValue}</p>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="secondary" className="text-xs">
              {deal.probability}%
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onEdit(deal)}
                aria-label="Editar deal"
              >
                <Pencil size={12} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDelete(deal.id)}
                aria-label="Remover deal"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

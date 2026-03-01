import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchContacts } from '../contacts/contacts.api';
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type CreateDealDto,
  type Deal,
  type DealStage,
} from './types';

interface FormValues {
  title: string;
  contactId: string;
  value: string;
  stage: DealStage;
  probability: string;
  notes: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  onSubmit: (data: CreateDealDto) => Promise<void>;
  loading?: boolean;
}

export function DealFormDialog({ open, onOpenChange, deal, onSubmit, loading }: Props) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      title: '',
      contactId: '',
      value: '',
      stage: 'PROSPECTING',
      probability: '10',
      notes: '',
    },
  });

  const stageValue = watch('stage');

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: () => fetchContacts({ limit: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      deal
        ? {
            title: deal.title,
            contactId: deal.contactId,
            value: String(Number(deal.value)),
            stage: deal.stage,
            probability: String(deal.probability),
            notes: deal.notes ?? '',
          }
        : {
            title: '',
            contactId: '',
            value: '',
            stage: 'PROSPECTING',
            probability: '10',
            notes: '',
          },
    );
  }, [open, deal, reset]);

  const isEditing = !!deal;

  const onFormSubmit = async (data: FormValues) => {
    await onSubmit({
      title: data.title,
      contactId: data.contactId,
      value: data.value ? Number(data.value) : undefined,
      stage: data.stage,
      probability: data.probability ? Number(data.probability) : undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Deal' : 'Novo Deal'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informacoes do deal.'
              : 'Preencha os dados para criar um novo deal.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onFormSubmit)(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titulo *</Label>
            <Input
              id="title"
              {...register('title', { required: true })}
              placeholder="Ex: Renovacao de contrato"
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="contactId">Contato *</Label>
              <Select
                value={watch('contactId')}
                onValueChange={(v) => setValue('contactId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contactsData?.data.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `— ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                {...register('value')}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                {...register('probability')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Estagio</Label>
            <Select
              value={stageValue}
              onValueChange={(v) => setValue('stage', v as DealStage)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DEAL_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Observacoes opcionais..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

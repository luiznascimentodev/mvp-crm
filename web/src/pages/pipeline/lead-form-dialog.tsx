import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, User2, Building2, Phone, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils';
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_FUNNEL_STAGES,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ICONS,
  type Lead,
  type LeadStage,
  type LeadSource,
  type CreateLeadDto,
} from './lead-types';

interface FormValues {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource | '';
  status: LeadStage;
  notes: string;
}

const DEFAULT: FormValues = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: '',
  status: 'new',
  notes: '',
};

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  defaultStage?: LeadStage;
  onSubmit: (data: CreateLeadDto) => Promise<void>;
  loading?: boolean;
}

interface StageSelectorProps {
  value: LeadStage;
  onChange: (stage: LeadStage) => void;
}

interface StageSelectorProps {
  value: LeadStage;
  onChange: (stage: LeadStage) => void;
}

function StageSelector({ value, onChange }: StageSelectorProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {LEAD_FUNNEL_STAGES.map((stage) => {
        const colors = LEAD_STAGE_COLORS[stage];
        const isSelected = value === stage;
        return (
          <button
            key={stage}
            type="button"
            onClick={() => onChange(stage)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
              isSelected
                ? cn(
                    colors.badge,
                    'border-transparent ring-1 ring-offset-1 ring-border',
                  )
                : 'border-border/40 text-muted-foreground hover:border-border bg-transparent',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                isSelected ? colors.dot : 'bg-muted-foreground/30',
              )}
            />
            {LEAD_STAGE_LABELS[stage]}
          </button>
        );
      })}
    </div>
  );
}

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  defaultStage = 'new',
  onSubmit,
  loading,
}: LeadFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT });

  const isEditing = !!lead;

  useEffect(() => {
    if (!open) return;
    if (lead) {
      reset({
        name: lead.name,
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        company: lead.company ?? '',
        source: (lead.source as LeadSource) ?? '',
        status: lead.status,
        notes: lead.notes ?? '',
      });
    } else {
      reset({ ...DEFAULT, status: defaultStage });
    }
  }, [open, lead, defaultStage, reset]);

  const onFormSubmit = async (formData: FormValues) => {
    await onSubmit({
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      source: formData.source || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => void handleSubmit(onFormSubmit)(event)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto orbit-scroll px-6 py-5 space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Identificação
              </p>

              <div className="space-y-1.5">
                <Label
                  htmlFor="name"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <User2 size={12} />
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  autoFocus
                  placeholder="João Silva"
                  className={cn(
                    'h-9 text-sm',
                    errors.name && 'border-destructive',
                  )}
                  {...register('name', { required: 'Nome é obrigatório' })}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="company"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Building2 size={12} />
                  Empresa
                </Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  className="h-9 text-sm"
                  {...register('company')}
                />
              </div>
            </div>

            {/* ── Seção 2: Contato ── */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Contato
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} />
                      E-mail
                    </span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@empresa.com"
                    {...register('email', {
                      validate: (v) =>
                        !v ||
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ||
                        'E-mail inválido',
                    })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} />
                      Telefone
                    </span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+55 11 99999-9999"
                    {...register('phone')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Origem
              </p>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as LeadSource)
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Como chegou este lead?" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          <span className="flex items-center gap-2 text-sm">
                            <span>{LEAD_SOURCE_ICONS[source]}</span>
                            {LEAD_SOURCE_LABELS[source]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Estágio no pipeline
              </p>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <StageSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Notas
              </p>
              <div className="space-y-1.5">
                <Label
                  htmlFor="notes"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <FileText size={12} />
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Contexto, interesse demonstrado, próximos passos..."
                  rows={3}
                  className="resize-none text-sm"
                  {...register('notes')}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="min-w-[110px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {isEditing ? 'Salvando...' : 'Criando...'}
                </span>
              ) : isEditing ? (
                'Salvar alterações'
              ) : (
                'Criar Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

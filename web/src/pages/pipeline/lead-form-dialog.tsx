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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  defaultStage?: LeadStage;
  onSubmit: (data: CreateLeadDto) => Promise<void>;
  loading?: boolean;
}

// ── Seletor visual de estágio ────────────────────────────────────────────────
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
                ? cn(colors.bg, colors.text, 'border-transparent ring-2 ring-offset-1', colors.dot.replace('bg-', 'ring-'))
                : 'border-border text-muted-foreground hover:border-muted-foreground bg-background',
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? colors.dot : 'bg-muted-foreground/40')} />
            {LEAD_STAGE_LABELS[stage]}
          </button>
        );
      })}
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────
export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  defaultStage = 'new',
  onSubmit,
  loading,
}: Props) {
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

  const onFormSubmit = async (data: FormValues) => {
    await onSubmit({
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      company: data.company || undefined,
      source: data.source || undefined,
      status: data.status,
      notes: data.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(onFormSubmit)(e)}
          className="space-y-5"
        >
          {/* ── Seção 1: Identificação ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Identificação
            </p>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                <span className="flex items-center gap-1.5">
                  <User2 size={13} />
                  Nome <span className="text-destructive">*</span>
                </span>
              </Label>
              <Input
                id="name"
                autoFocus
                placeholder="João Silva"
                {...register('name', { required: 'Nome é obrigatório' })}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Empresa */}
            <div className="space-y-1.5">
              <Label htmlFor="company">
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} />
                  Empresa
                </span>
              </Label>
              <Input
                id="company"
                placeholder="Acme Corp"
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
                      !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail inválido',
                  })}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
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

          {/* ── Seção 3: Origem ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Origem do lead
            </p>
            <Controller
              name="source"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as LeadSource)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Como chegou este lead?" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2">
                          <span>{LEAD_SOURCE_ICONS[s]}</span>
                          {LEAD_SOURCE_LABELS[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* ── Seção 4: Estágio no pipeline ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Estágio no pipeline
            </p>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <StageSelector value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          {/* ── Seção 5: Notas ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Notas
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="notes">
                <span className="flex items-center gap-1.5">
                  <FileText size={13} />
                  Observações sobre o lead
                </span>
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

          <DialogFooter className="pt-1 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
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

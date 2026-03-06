import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  loading?: boolean;
  trend?: number | null; // % variação; positivo = bom, negativo = ruim, null = sem dado
  trendInverted?: boolean; // se true, negativo é bom (ex: leads perdidos)
  highlight?: 'success' | 'warning' | 'danger' | 'default';
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
  trend,
  trendInverted = false,
  highlight = 'default',
}: MetricCardProps) {
  const hasTrend = trend !== null && trend !== undefined;
  const isPositive = trendInverted ? trend! < 0 : trend! > 0;
  const isNeutral = trend === 0;

  const iconStyles = {
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
    default: 'bg-primary/10 text-primary',
  };

  return (
    <Card className="border-border/50 bg-card shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2.5 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold text-foreground tracking-tight leading-none">
                {value}
              </p>
            )}
            <div className="flex items-center gap-2 min-h-[18px]">
              {hasTrend && !loading && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    isNeutral
                      ? 'text-muted-foreground'
                      : isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {isNeutral ? (
                    <Minus className="h-3 w-3" />
                  ) : isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(trend!)}% vs mês ant.
                </span>
              )}
              {description && !hasTrend && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <div
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
              iconStyles[highlight],
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

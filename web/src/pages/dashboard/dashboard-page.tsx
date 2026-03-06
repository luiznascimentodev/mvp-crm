import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  Users,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
  Flame,
  Clock,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from './metric-card';
import { useDashboard } from './use-dashboard';
import { STAGE_COLORS, STAGE_LABELS } from './dashboard.types';
import type { LeadStatus } from './dashboard.types';
import { useQueryClient } from '@tanstack/react-query';

const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
};

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-muted"
      style={{ height }}
    />
  );
}

function ProgressBar({
  value,
  color,
  max,
}: {
  value: number;
  color: string;
  max: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function DashboardPage() {
  const {
    metrics,
    leadsOverTime,
    topPerformers,
    funnel,
    leadsBySource,
    days,
    setDays,
  } = useDashboard();

  const queryClient = useQueryClient();
  const m = metrics.data;
  const isLoading = metrics.isLoading;

  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  const statusPieData = m
    ? [
        { name: 'Ativos', value: m.activeLeads, color: '#3b82f6' },
        { name: 'Ganhos', value: m.wonLeads, color: '#10b981' },
        { name: 'Perdidos', value: m.lostLeads, color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : [];

  const maxFunnelCount = Math.max(
    ...(funnel.data ?? []).map((f) => f.count),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {`Vis\u00e3o completa do seu pipeline comercial`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* KPIs linha 1 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads Totais"
          value={m?.totalLeads ?? '—'}
          icon={Target}
          loading={isLoading}
          trend={m?.newLeadsTrend ?? null}
          highlight="default"
        />
        <MetricCard
          title="Leads Ativos"
          value={m?.activeLeads ?? '—'}
          icon={Flame}
          loading={isLoading}
          description="no funil agora"
          highlight="warning"
        />
        <MetricCard
          title="Leads Ganhos"
          value={m?.wonLeads ?? '—'}
          icon={Trophy}
          loading={isLoading}
          description="status = ganho"
          highlight="success"
        />
        <MetricCard
          title="Leads Perdidos"
          value={m?.lostLeads ?? '—'}
          icon={XCircle}
          loading={isLoading}
          description="status = perdido"
          highlight="danger"
        />
      </div>

      {/* KPIs linha 2 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={`Taxa de Convers\u00e3o`}
          value={m != null ? `${m.conversionRate}%` : '—'}
          icon={TrendingUp}
          loading={isLoading}
          description="ganhos / (ganhos + perdidos)"
          highlight={
            (m?.conversionRate ?? 0) >= 50
              ? 'success'
              : (m?.conversionRate ?? 0) >= 25
                ? 'warning'
                : 'danger'
          }
        />
        <MetricCard
          title={`Em Negocia\u00e7\u00e3o`}
          value={m?.leadsInNegotiation ?? '—'}
          icon={BarChart2}
          loading={isLoading}
          description="leads quentes"
          highlight="warning"
        />
        <MetricCard
          title={`Novos Este M\u00eas`}
          value={m?.newLeadsThisMonth ?? '—'}
          icon={Users}
          loading={isLoading}
          trend={m?.newLeadsTrend ?? null}
          highlight="default"
        />
        <MetricCard
          title={`Tempo M\u00e9dio (dias)`}
          value={m?.avgDaysToConvert != null ? `${m.avgDaysToConvert}d` : '—'}
          icon={Clock}
          loading={isLoading}
          description="da entrada ao fechamento"
          highlight={
            (m?.avgDaysToConvert ?? 999) <= 14
              ? 'success'
              : (m?.avgDaysToConvert ?? 999) <= 30
                ? 'warning'
                : 'danger'
          }
        />
      </div>

      {/* Evolução do Pipeline */}
      <Card className="border-border/50 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-5 pt-5">
          <div>
            <CardTitle className="text-sm font-medium text-foreground">
              {`Evolu\u00e7\u00e3o do Pipeline`}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Entradas, ganhos e perdidos por dia
            </p>
          </div>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((period) => (
              <Button
                key={period}
                variant={days === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDays(period)}
                className="h-7 px-3 text-xs"
              >
                {period}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {leadsOverTime.isLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={leadsOverTime.data ?? []}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--primary)"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    strokeOpacity={0.06}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'count'
                        ? 'Entradas'
                        : name === 'won'
                          ? 'Ganhos'
                          : 'Perdidos',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#gradCount)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="won"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fill="url(#gradWon)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) =>
                      value === 'count'
                        ? 'Entradas'
                        : value === 'won'
                          ? 'Ganhos'
                          : value
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funil + Distribuição */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="border-border/50 shadow-none lg:col-span-3">
          <CardHeader className="px-5 pt-5 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {`Funil de Convers\u00e3o`}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {`Volume por est\u00e1gio e taxa de avan\u00e7o`}
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {funnel.isLoading ? (
              <ChartSkeleton height={280} />
            ) : (
              <div className="space-y-2.5">
                {(funnel.data ?? []).map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{
                            background: STAGE_COLORS[item.status as LeadStatus],
                          }}
                        />
                        <span className="text-foreground font-medium">
                          {STAGE_LABELS[item.status as LeadStatus]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.conversionToNext != null && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5"
                          >
                            {`${item.conversionToNext}% avan\u00e7a`}
                          </Badge>
                        )}
                        <span className="font-semibold text-foreground w-6 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      value={item.count}
                      max={maxFunnelCount}
                      color={STAGE_COLORS[item.status as LeadStatus]}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-none lg:col-span-2">
          <CardHeader className="px-5 pt-5 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {`Distribui\u00e7\u00e3o Geral`}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {`Propor\u00e7\u00e3o do total de leads`}
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {isLoading ? (
              <ChartSkeleton height={200} />
            ) : statusPieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhum lead ainda
              </p>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconSize={8}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top performers + Canal */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border/50 shadow-none">
          <CardHeader className="flex flex-row items-center gap-2 px-5 pt-5 pb-2">
            <Trophy className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-medium text-foreground">
                Top Vendedores
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {`Por leads ganhos e taxa de convers\u00e3o`}
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {topPerformers.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 w-full animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : (topPerformers.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum lead ganho ainda
              </p>
            ) : (
              <div className="space-y-2">
                {(topPerformers.data ?? []).map((performer, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div
                      key={performer.userId}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-base w-5 flex-shrink-0">
                        {medals[index] ?? `${index + 1}.`}
                      </span>
                      <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-primary">
                          {performer.userName.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {performer.userName}
                        </p>
                        <ProgressBar
                          value={performer.wonLeads}
                          max={(topPerformers.data ?? [])[0]?.wonLeads ?? 1}
                          color="#10b981"
                        />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {performer.wonLeads} ganho
                          {performer.wonLeads !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {performer.conversionRate}% conv.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-none">
          <CardHeader className="px-5 pt-5 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Leads por Canal
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Volume e {`convers\u00e3o`} por fonte de origem
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {leadsBySource.isLoading ? (
              <ChartSkeleton height={220} />
            ) : (leadsBySource.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {`Nenhum dado de fonte dispon\u00edvel`}
              </p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={leadsBySource.data ?? []}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                    barSize={10}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="currentColor"
                      strokeOpacity={0.06}
                    />
                    <XAxis
                      type="number"
                      tick={{
                        fontSize: 10,
                        fill: 'currentColor',
                        opacity: 0.5,
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="source"
                      tick={{
                        fontSize: 10,
                        fill: 'currentColor',
                        opacity: 0.7,
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'total' ? 'Total' : 'Ganhos',
                      ]}
                    />
                    <Bar
                      dataKey="total"
                      name="Total"
                      fill="var(--primary)"
                      fillOpacity={0.25}
                      radius={[0, 3, 3, 0]}
                    />
                    <Bar
                      dataKey="won"
                      name="Ganhos"
                      fill="#10b981"
                      radius={[0, 3, 3, 0]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

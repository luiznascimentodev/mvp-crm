import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Users, Target, TrendingUp, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCard } from './metric-card';
import { useDashboard } from './use-dashboard';
import { STAGE_COLORS, STAGE_LABELS } from './dashboard.types';
import type { LeadStatus } from './dashboard.types';

export function DashboardPage() {
  const { metrics, leadsOverTime, topPerformers, funnel, days, setDays } =
    useDashboard();

  const m = metrics.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Visão geral do seu pipeline comercial
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Contatos"
          value={m?.totalContacts ?? '—'}
          icon={Users}
          loading={metrics.isLoading}
        />
        <MetricCard
          title="Leads Ativos"
          value={m?.totalLeads ?? '—'}
          icon={Target}
          loading={metrics.isLoading}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={m != null ? `${m.conversionRate}%` : '—'}
          description="leads ganhos / total"
          icon={TrendingUp}
          loading={metrics.isLoading}
        />
        <MetricCard
          title="Leads Ganhos"
          value={m?.wonLeads ?? '—'}
          description="status = ganho"
          icon={Trophy}
          loading={metrics.isLoading}
        />
      </div>

      {/* Leads Over Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Leads ao Longo do Tempo</CardTitle>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {leadsOverTime.isLoading ? (
            <div className="h-64 w-full animate-pulse rounded bg-muted" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={leadsOverTime.data ?? []}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'count' ? 'Leads' : name,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.isLoading ? (
              <div className="h-64 w-full animate-pulse rounded bg-muted" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(funnel.data ?? []).map((item) => ({
                      ...item,
                      label: STAGE_LABELS[item.status as LeadStatus],
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      angle={-30}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                      {(funnel.data ?? []).map((item) => (
                        <Cell
                          key={item.status}
                          fill={STAGE_COLORS[item.status as LeadStatus]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Top Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-full animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            ) : (topPerformers.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum lead ganho ainda
              </p>
            ) : (
              <div className="space-y-3">
                {(topPerformers.data ?? []).map((performer, idx) => (
                  <div
                    key={performer.userId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-5">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {performer.userName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {performer.wonLeads} lead
                          {performer.wonLeads !== 1 ? 's' : ''} ganho
                          {performer.wonLeads !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

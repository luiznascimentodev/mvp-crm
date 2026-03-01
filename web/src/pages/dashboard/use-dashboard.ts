import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchConversionFunnel,
  fetchLeadsOverTime,
  fetchDashboardMetrics,
  fetchTopPerformers,
} from './dashboard.api';

export function useDashboard() {
  const [days, setDays] = useState(30);

  const metrics = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
  });

  const leadsOverTime = useQuery({
    queryKey: ['dashboard', 'leads-over-time', days],
    queryFn: () => fetchLeadsOverTime(days),
  });

  const topPerformers = useQuery({
    queryKey: ['dashboard', 'top-performers'],
    queryFn: fetchTopPerformers,
  });

  const funnel = useQuery({
    queryKey: ['dashboard', 'funnel'],
    queryFn: fetchConversionFunnel,
  });

  return {
    metrics,
    leadsOverTime,
    topPerformers,
    funnel,
    days,
    setDays,
  };
}

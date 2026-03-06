import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchConversionFunnel,
  fetchLeadsOverTime,
  fetchDashboardMetrics,
  fetchTopPerformers,
  fetchLeadsBySource,
} from './dashboard.api';

export function useDashboard() {
  const [days, setDays] = useState(30);

  const metrics = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
    staleTime: 1000 * 60 * 2, // 2 min
  });

  const leadsOverTime = useQuery({
    queryKey: ['dashboard', 'leads-over-time', days],
    queryFn: () => fetchLeadsOverTime(days),
    staleTime: 1000 * 60 * 2,
  });

  const topPerformers = useQuery({
    queryKey: ['dashboard', 'top-performers'],
    queryFn: fetchTopPerformers,
    staleTime: 1000 * 60 * 5,
  });

  const funnel = useQuery({
    queryKey: ['dashboard', 'funnel'],
    queryFn: fetchConversionFunnel,
    staleTime: 1000 * 60 * 2,
  });

  const leadsBySource = useQuery({
    queryKey: ['dashboard', 'leads-by-source'],
    queryFn: fetchLeadsBySource,
    staleTime: 1000 * 60 * 5,
  });

  return {
    metrics,
    leadsOverTime,
    topPerformers,
    funnel,
    leadsBySource,
    days,
    setDays,
  };
}

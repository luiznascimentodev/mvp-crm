import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchConversionFunnel,
  fetchDealsOverTime,
  fetchDashboardMetrics,
  fetchTopPerformers,
} from './dashboard.api';

export function useDashboard() {
  const [days, setDays] = useState(30);

  const metrics = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
  });

  const dealsOverTime = useQuery({
    queryKey: ['dashboard', 'deals-over-time', days],
    queryFn: () => fetchDealsOverTime(days),
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
    dealsOverTime,
    topPerformers,
    funnel,
    days,
    setDays,
  };
}

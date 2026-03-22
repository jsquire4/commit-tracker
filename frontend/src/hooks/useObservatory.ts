import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAlignmentTrend,
  getCarryChains,
  getCompletionTrend,
  getCostImpact,
  getDisplacementReport,
  getDriftReport,
  getExecutiveHealth,
  getIntegrityReport,
  getObservatoryConfig,
  getObservatoryDashboard,
  getPortfolioHealth,
  getProgramHeatmap,
  getSignalsSummary,
  updateObservatoryConfig,
} from '@/api/observatory.api';
import type { ObservatoryConfig } from '@/types';

const OBSERVATORY_KEYS = {
  dashboard: (weekCount?: number) => ['observatory', 'dashboard', weekCount] as const,
  executiveHealth: (weekCount?: number) => ['observatory', 'executiveHealth', weekCount] as const,
  driftReport: (weekCount?: number) => ['observatory', 'driftReport', weekCount] as const,
  alignmentTrend: (weekCount?: number, managerId?: string) => ['observatory', 'alignmentTrend', weekCount, managerId] as const,
  completionTrend: (weekCount?: number, managerId?: string) => ['observatory', 'completionTrend', weekCount, managerId] as const,
  costImpact: (cycleId?: string) => ['observatory', 'costImpact', cycleId] as const,
  displacementReport: (weekCount?: number) => ['observatory', 'displacementReport', weekCount] as const,
  carryChains: (cycleId: string) => ['observatory', 'carryChains', cycleId] as const,
  integrityReport: (cycleId?: string) => ['observatory', 'integrityReport', cycleId] as const,
  config: () => ['observatory', 'config'] as const,
  portfolioHealth: () => ['observatory', 'portfolioHealth'] as const,
  programHeatmap: (weekCount?: number) => ['observatory', 'programHeatmap', weekCount] as const,
  signalsSummary: (weekCount?: number) => ['observatory', 'signalsSummary', weekCount] as const,
} as const;

export function useObservatoryDashboard(weekCount?: number) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.dashboard(weekCount),
    queryFn: () => getObservatoryDashboard(weekCount),
    staleTime: 60_000,
  });
}

export function useExecutiveHealth(weekCount?: number) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.executiveHealth(weekCount),
    queryFn: () => getExecutiveHealth(weekCount),
    staleTime: 60_000,
  });
}

export function useDriftReport(weekCount?: number) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.driftReport(weekCount),
    queryFn: () => getDriftReport(weekCount),
    staleTime: 60_000,
  });
}

export function useAlignmentTrend(weekCount?: number, managerId?: string) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.alignmentTrend(weekCount, managerId),
    queryFn: () => getAlignmentTrend(weekCount, managerId),
    staleTime: 60_000,
  });
}

export function useCompletionTrend(weekCount?: number, managerId?: string) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.completionTrend(weekCount, managerId),
    queryFn: () => getCompletionTrend(weekCount, managerId),
    staleTime: 60_000,
  });
}

export function useCostImpact(cycleId?: string) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.costImpact(cycleId),
    queryFn: () => getCostImpact(cycleId),
    staleTime: 60_000,
  });
}

export function useDisplacementReport(weekCount?: number) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.displacementReport(weekCount),
    queryFn: () => getDisplacementReport(weekCount),
    staleTime: 60_000,
  });
}

export function useCarryChains(cycleId: string) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.carryChains(cycleId),
    queryFn: () => getCarryChains(cycleId),
    staleTime: 30_000,
    enabled: Boolean(cycleId),
  });
}

export function useIntegrityReport(cycleId?: string) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.integrityReport(cycleId),
    queryFn: () => getIntegrityReport(cycleId),
    staleTime: 60_000,
  });
}

export function useObservatoryConfig() {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.config(),
    queryFn: getObservatoryConfig,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateObservatoryConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<ObservatoryConfig>) => updateObservatoryConfig(config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OBSERVATORY_KEYS.config() });
    },
  });
}

export function usePortfolioHealth() {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.portfolioHealth(),
    queryFn: getPortfolioHealth,
    staleTime: 60_000,
  });
}

export function useProgramHeatmap(weekCount?: number) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.programHeatmap(weekCount),
    queryFn: () => getProgramHeatmap(weekCount),
    staleTime: 60_000,
  });
}

export function useSignalsSummary(weekCount?: number) {
  return useQuery({
    queryKey: OBSERVATORY_KEYS.signalsSummary(weekCount),
    queryFn: () => getSignalsSummary(weekCount),
    staleTime: 60_000,
  });
}

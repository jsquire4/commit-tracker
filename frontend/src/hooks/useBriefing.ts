import { useQuery } from '@tanstack/react-query';
import { getBriefing } from '@/api/briefing.api';
import type { BriefingResponse } from '@/types/briefing.types';

export function useBriefing(cycleId: string | undefined) {
  return useQuery<BriefingResponse>({
    queryKey: ['briefing', cycleId ?? ''],
    queryFn: () => getBriefing(cycleId!),
    staleTime: 5 * 60_000,
    enabled: Boolean(cycleId),
  });
}

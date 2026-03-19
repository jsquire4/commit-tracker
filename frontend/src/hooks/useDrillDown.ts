import { useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export type BriefingMode = 'briefing' | 'health' | 'strategy' | 'config';

export interface DrillDownState {
  rallyCryId: string | null;
  teamId: string | null;
  personId: string | null;
  mode: BriefingMode;
  depth: 0 | 1 | 2 | 3;
  direction: 'in' | 'out';
}

const DRILL_KEYS = ['rc', 'team', 'person'] as const;

export function useDrillDown() {
  const [params, setParams] = useSearchParams();
  const directionRef = useRef<'in' | 'out'>('in');

  const state = useMemo<DrillDownState>(() => {
    const rallyCryId = params.get('rc');
    const teamId = params.get('team');
    const personId = params.get('person');
    const rawMode = params.get('mode');
    const mode: BriefingMode =
      rawMode === 'health' || rawMode === 'strategy' || rawMode === 'config'
        ? rawMode
        : 'briefing';

    let depth: DrillDownState['depth'] = 0;
    if (personId) depth = 3;
    else if (teamId) depth = 2;
    else if (rallyCryId) depth = 1;

    return {
      rallyCryId,
      teamId,
      personId,
      mode,
      depth,
      direction: directionRef.current,
    };
  }, [params]);

  const drillTo = useCallback(
    (updates: Partial<Record<'rc' | 'team' | 'person' | 'mode', string>>) => {
      directionRef.current = 'in';
      setParams((prev) => {
        const next = new URLSearchParams(prev);

        // When drilling to a specific level, clear all deeper levels
        if ('rc' in updates || 'team' in updates || 'person' in updates) {
          // Clear mode when drilling into content
          next.delete('mode');

          const updatedKeys = Object.keys(updates).filter((k) =>
            DRILL_KEYS.includes(k as (typeof DRILL_KEYS)[number]),
          );
          if (updatedKeys.length > 0) {
            const deepestKey = updatedKeys[updatedKeys.length - 1]! as (typeof DRILL_KEYS)[number];
            const keyIndex = DRILL_KEYS.indexOf(deepestKey);
            for (let i = keyIndex + 1; i < DRILL_KEYS.length; i++) {
              const key = DRILL_KEYS[i];
              if (key) next.delete(key);
            }
          }
        }

        for (const [k, v] of Object.entries(updates)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }

        return next;
      });
    },
    [setParams],
  );

  const drillUp = useCallback(() => {
    directionRef.current = 'out';
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (next.has('person')) next.delete('person');
      else if (next.has('team')) next.delete('team');
      else if (next.has('rc')) next.delete('rc');
      return next;
    });
  }, [setParams]);

  const setMode = useCallback(
    (mode: BriefingMode) => {
      directionRef.current = 'in';
      setParams(() => {
        const next = new URLSearchParams();
        if (mode !== 'briefing') {
          next.set('mode', mode);
        }
        return next;
      });
    },
    [setParams],
  );

  const resetDrill = useCallback(() => {
    directionRef.current = 'out';
    setParams({});
  }, [setParams]);

  return { ...state, drillTo, drillUp, setMode, resetDrill };
}

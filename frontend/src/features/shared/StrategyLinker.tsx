import { useState, useMemo, useRef, useEffect } from 'react';
import { useRcdoTree } from '@/hooks/useRcdo';
import type { RcdoLink } from '@/types/commitment.types';
import type { RallyCryNode } from '@/types/rcdo.types';

// ─── Rally Cry Colors ─────────────────────────────────────────────────────────

const RC_COLORS = [
  { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  { dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { dot: 'bg-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  { dot: 'bg-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
];

function rcColor(index: number) {
  return RC_COLORS[index % RC_COLORS.length]!;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatOutcome {
  rallyCryId: string;
  rallyCryTitle: string;
  rallyCryIndex: number;
  definingObjectiveId: string;
  definingObjectiveTitle: string;
  outcomeId: string;
  outcomeTitle: string;
}

interface SuggestionChip {
  rallyCryId: string;
  rallyCryTitle: string;
  definingObjectiveId: string;
  definingObjectiveTitle: string;
  outcomeId: string;
  outcomeTitle: string;
  reason: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StrategyLinkerProps {
  value: RcdoLink;
  onChange: (link: RcdoLink) => void;
  suggestion?: SuggestionChip | null;
  disabled?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StrategyLinker({
  value,
  onChange,
  suggestion,
  disabled = false,
}: StrategyLinkerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: rcdoTree } = useRcdoTree();

  // Flatten the RCDO tree into a flat outcome list
  const flatOutcomes = useMemo<FlatOutcome[]>(() => {
    if (!rcdoTree?.rallyCries) return [];
    const items: FlatOutcome[] = [];
    rcdoTree.rallyCries.forEach((rc: RallyCryNode, rcIdx: number) => {
      for (const doNode of rc.definingObjectives) {
        for (const oc of doNode.outcomes) {
          items.push({
            rallyCryId: rc.id,
            rallyCryTitle: rc.title,
            rallyCryIndex: rcIdx,
            definingObjectiveId: doNode.id,
            definingObjectiveTitle: doNode.title,
            outcomeId: oc.id,
            outcomeTitle: oc.title,
          });
        }
      }
    });
    return items;
  }, [rcdoTree]);

  // Filter outcomes by search text
  const filtered = useMemo(() => {
    if (!filter.trim()) return flatOutcomes;
    const q = filter.toLowerCase();
    return flatOutcomes.filter(
      (o) =>
        o.outcomeTitle.toLowerCase().includes(q) ||
        o.definingObjectiveTitle.toLowerCase().includes(q) ||
        o.rallyCryTitle.toLowerCase().includes(q),
    );
  }, [flatOutcomes, filter]);

  // Group filtered outcomes by rally cry
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { rallyCryTitle: string; rallyCryIndex: number; objectives: Map<string, { title: string; outcomes: FlatOutcome[] }> }
    >();
    for (const o of filtered) {
      if (!map.has(o.rallyCryId)) {
        map.set(o.rallyCryId, {
          rallyCryTitle: o.rallyCryTitle,
          rallyCryIndex: o.rallyCryIndex,
          objectives: new Map(),
        });
      }
      const rc = map.get(o.rallyCryId)!;
      if (!rc.objectives.has(o.definingObjectiveId)) {
        rc.objectives.set(o.definingObjectiveId, {
          title: o.definingObjectiveTitle,
          outcomes: [],
        });
      }
      rc.objectives.get(o.definingObjectiveId)!.outcomes.push(o);
    }
    return [...map.entries()].sort((a, b) => a[1].rallyCryIndex - b[1].rallyCryIndex);
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('mousedown', handleClick); };
  }, [open]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  function selectOutcome(o: FlatOutcome) {
    onChange({
      rallyCryId: o.rallyCryId,
      rallyCryTitle: o.rallyCryTitle,
      definingObjectiveId: o.definingObjectiveId,
      definingObjectiveTitle: o.definingObjectiveTitle,
      outcomeId: o.outcomeId,
      outcomeTitle: o.outcomeTitle,
    });
    setOpen(false);
    setFilter('');
  }

  function selectRallyCryOnly(rcId: string, rcTitle: string) {
    onChange({
      rallyCryId: rcId,
      rallyCryTitle: rcTitle,
      definingObjectiveId: null,
      definingObjectiveTitle: null,
      outcomeId: null,
      outcomeTitle: null,
    });
    setOpen(false);
    setFilter('');
  }

  function clearLink() {
    onChange({
      rallyCryId: null,
      rallyCryTitle: null,
      definingObjectiveId: null,
      definingObjectiveTitle: null,
      outcomeId: null,
      outcomeTitle: null,
    });
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    onChange({
      rallyCryId: suggestion.rallyCryId,
      rallyCryTitle: suggestion.rallyCryTitle,
      definingObjectiveId: suggestion.definingObjectiveId,
      definingObjectiveTitle: suggestion.definingObjectiveTitle,
      outcomeId: suggestion.outcomeId,
      outcomeTitle: suggestion.outcomeTitle,
    });
  }

  const isLinked = Boolean(value.rallyCryId);

  // Current value display
  const displayText = isLinked
    ? [value.rallyCryTitle, value.definingObjectiveTitle, value.outcomeTitle]
        .filter(Boolean)
        .join(' \u203A ')
    : null;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
        Strategy Link
      </label>

      {/* Suggestion chip (shown when not yet linked and a suggestion exists) */}
      {!isLinked && suggestion && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2">
          <span className="text-xs text-gray-400">Suggested:</span>
          <span className="text-xs text-blue-300 font-medium truncate">
            {suggestion.rallyCryTitle} \u203A {suggestion.outcomeTitle}
          </span>
          <span className="text-[10px] text-gray-500">({suggestion.reason})</span>
          <button
            type="button"
            disabled={disabled}
            onClick={acceptSuggestion}
            className="ml-auto flex-shrink-0 px-2 py-0.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            &#10003; Accept
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setOpen(true); }}
            className="flex-shrink-0 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Change
          </button>
        </div>
      )}

      {/* Current link display */}
      {isLinked && (
        <div className="flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2">
          <span className="text-sm text-gray-200 truncate">{displayText}</span>
          {!disabled && (
            <div className="ml-auto flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setOpen(true); }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Change
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={clearLink}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trigger button (shown when not linked and no suggestion) */}
      {!isLinked && !suggestion && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setOpen(true); }}
          className="w-full rounded-md border border-dashed border-gray-600 px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-300 transition-colors text-left disabled:opacity-50"
        >
          Link to strategy...
        </button>
      )}

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-40 mt-1 w-full max-w-md max-h-80 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl flex flex-col"
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-800">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); }}
              placeholder="Search outcomes, objectives, rally cries..."
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Grouped list */}
          <div className="flex-1 overflow-y-auto p-1">
            {grouped.map(([rcId, rc]) => {
              const colors = rcColor(rc.rallyCryIndex);
              return (
                <div key={rcId} className="mb-1">
                  {/* Rally cry header — clickable to link at RC level */}
                  <button
                    type="button"
                    onClick={() => { selectRallyCryOnly(rcId, rc.rallyCryTitle); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${colors.text} hover:${colors.bg} rounded transition-colors`}
                  >
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    {rc.rallyCryTitle}
                  </button>
                  {/* Objectives and outcomes */}
                  {[...rc.objectives.entries()].map(([doId, doNode]) => (
                    <div key={doId} className="ml-4">
                      <p className="px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {doNode.title}
                      </p>
                      {doNode.outcomes.map((oc) => (
                        <button
                          key={oc.outcomeId}
                          type="button"
                          onClick={() => { selectOutcome(oc); }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} opacity-50`} />
                          {oc.outcomeTitle}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Non-strategic option */}
            <div className="border-t border-gray-800 mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  clearLink();
                  setOpen(false);
                  setFilter('');
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-800 hover:text-gray-300 rounded transition-colors italic"
              >
                Mark as non-strategic
              </button>
            </div>

            {grouped.length === 0 && filter && (
              <p className="text-center text-xs text-gray-600 py-4">
                No outcomes match &ldquo;{filter}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

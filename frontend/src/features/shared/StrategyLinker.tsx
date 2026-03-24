import { useState, useMemo, useRef, useEffect } from 'react';
import { useRcdoTree } from '@/hooks/useRcdo';
import type { RcdoLink } from '@/types/commitment.types';
import type { RallyCryNode } from '@/types/rcdo.types';

// ─── Rally Cry Colors ─────────────────────────────────────────────────────────

const RC_COLORS = [
  { dot: 'bg-navy', text: 'text-navy' },
  { dot: 'bg-error', text: 'text-error' },
  { dot: 'bg-accent', text: 'text-accent' },
  { dot: 'bg-warning', text: 'text-warning' },
  { dot: 'bg-capability', text: 'text-capability' },
  { dot: 'bg-muted', text: 'text-muted' },
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
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setFilter('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
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

  return (
    <div className="space-y-2">
      <label className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
        Link to strategy <span className="normal-case font-normal tracking-normal text-muted">(optional)</span>
      </label>

      {/* Suggestion chip */}
      {!isLinked && suggestion && (
        <div className="flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/[0.04] px-3 py-2">
          <span className="text-small text-muted">Suggested:</span>
          <span className="text-small text-accent font-medium truncate">
            {suggestion.rallyCryTitle} &#8250; {suggestion.outcomeTitle}
          </span>
          <span className="text-[0.625rem] text-muted">({suggestion.reason})</span>
          <button
            type="button"
            disabled={disabled}
            onClick={acceptSuggestion}
            className="ml-auto flex-shrink-0 px-2 py-0.5 text-small font-medium text-accent bg-accent/10 rounded-sm hover:bg-accent/20 transition-colors duration-[150ms] disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setOpen(true); }}
            className="flex-shrink-0 px-2 py-0.5 text-small text-muted hover:text-on-surface-variant transition-colors duration-[150ms] disabled:opacity-50"
          >
            Change
          </button>
        </div>
      )}

      {/* Current link display — breadcrumb style */}
      {isLinked && (
        <div>
          <div className="flex items-center gap-2 rounded-sm border border-outline-variant bg-surface-container-low px-3.5 py-2.5">
            <span className="text-[0.8125rem] text-on-surface truncate flex-1 min-w-0">
              {value.rallyCryTitle}
              {value.definingObjectiveTitle && (
                <><span className="text-muted mx-1">&#8250;</span>{value.definingObjectiveTitle}</>
              )}
              {value.outcomeTitle && (
                <><span className="text-muted mx-1">&#8250;</span>{value.outcomeTitle}</>
              )}
            </span>
          </div>
          {!disabled && (
            <div className="flex gap-3 mt-1.5">
              <button
                type="button"
                onClick={() => { setOpen(true); }}
                className="text-label font-medium text-accent hover:text-accent-dark transition-colors duration-[150ms]"
              >
                Change
              </button>
              <button
                type="button"
                onClick={clearLink}
                className="text-label font-medium text-muted hover:text-on-surface-variant transition-colors duration-[150ms]"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trigger button */}
      {!isLinked && !suggestion && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setOpen(true); }}
          className="w-full rounded-sm border border-dashed border-outline-variant px-3 py-2 text-body text-muted hover:border-accent hover:text-accent transition-colors duration-[200ms] text-left disabled:opacity-50"
        >
          Link to strategy...
        </button>
      )}

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label="Link to strategy"
          className="absolute z-40 mt-2 w-full max-w-md max-h-80 overflow-hidden rounded-sm border border-outline-variant bg-surface-lowest shadow-whisper flex flex-col"
          style={{ boxShadow: 'var(--whisper-shadow, 0 12px 32px -4px rgba(45,52,50,0.06)), 0 4px 16px rgba(45,52,50,0.10)' }}
        >
          {/* Search input */}
          <div className="p-2.5 border-b border-outline-variant">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); }}
              placeholder="Search outcomes, objectives, rally cries..."
              className="w-full rounded-sm border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-[0.8125rem] text-on-surface placeholder:text-muted focus:outline-none focus:border-accent transition-colors duration-[200ms]"
            />
          </div>

          {/* Grouped list */}
          <div className="flex-1 overflow-y-auto p-1.5 scrollbar-thin">
            {grouped.map(([rcId, rc]) => {
              const colors = rcColor(rc.rallyCryIndex);
              return (
                <div key={rcId} className="mb-1">
                  {/* Rally cry header */}
                  <button
                    type="button"
                    onClick={() => { selectRallyCryOnly(rcId, rc.rallyCryTitle); }}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-small font-semibold uppercase tracking-[0.05em] ${colors.text} hover:bg-surface-container-low rounded-sm transition-colors duration-[120ms]`}
                  >
                    <span className={`w-[7px] h-[7px] rounded-full ${colors.dot}`} />
                    {rc.rallyCryTitle}
                  </button>
                  {/* Objectives and outcomes */}
                  {[...rc.objectives.entries()].map(([doId, doNode]) => (
                    <div key={doId} className="ml-4">
                      <p className="px-2 py-1 text-small font-medium text-on-surface-variant uppercase tracking-[0.03em]">
                        {doNode.title}
                      </p>
                      {doNode.outcomes.map((oc) => (
                        <button
                          key={oc.outcomeId}
                          type="button"
                          onClick={() => { selectOutcome(oc); }}
                          className="w-full text-left px-2 py-1.5 text-[0.8125rem] text-on-surface hover:bg-surface-container-low rounded-sm transition-colors duration-[120ms] flex items-center gap-1.5"
                        >
                          <span className={`w-[5px] h-[5px] rounded-full ${colors.dot} opacity-50`} />
                          {oc.outcomeTitle}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Non-strategic option */}
            <div className="border-t border-outline-variant mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  clearLink();
                  setOpen(false);
                  setFilter('');
                }}
                className="w-full text-left px-2.5 py-2 text-[0.8125rem] text-muted hover:bg-surface-container-low hover:text-on-surface-variant rounded-sm transition-colors duration-[120ms] italic"
              >
                Mark as non-strategic
              </button>
            </div>

            {grouped.length === 0 && filter && (
              <p className="text-center text-small text-muted py-4">
                No outcomes match &ldquo;{filter}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

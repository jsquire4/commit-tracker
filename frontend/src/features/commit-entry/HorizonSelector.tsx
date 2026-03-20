import type { CompletionHorizon, CompletionDay, CompletionTimeBlock } from '@/types';

interface HorizonValue {
  day: CompletionDay | undefined;
  timeBlock: CompletionTimeBlock | undefined;
  /** Legacy horizon for backward compatibility */
  horizon: CompletionHorizon;
}

interface HorizonSelectorProps {
  value: CompletionHorizon;
  day?: CompletionDay;
  timeBlock?: CompletionTimeBlock;
  onChange: (h: CompletionHorizon) => void;
  onDayTimeChange?: (v: HorizonValue) => void;
  disabled?: boolean;
}

const DAYS: { value: CompletionDay; label: string }[] = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
];

const TIME_BLOCKS: { value: CompletionTimeBlock; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'MIDDAY', label: 'Midday' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EOD', label: 'EOD' },
];

/** Compute a legacy CompletionHorizon from day + timeBlock */
function computeLegacyHorizon(day: CompletionDay | undefined, timeBlock: CompletionTimeBlock | undefined): CompletionHorizon {
  if (day === 'FRIDAY' && timeBlock === 'EOD') return 'EOW';
  if (timeBlock) return timeBlock as CompletionHorizon;
  return 'EOD';
}

export function HorizonSelector({
  value,
  day,
  timeBlock,
  onChange,
  onDayTimeChange,
  disabled = false,
}: HorizonSelectorProps) {
  // Derive initial day/timeBlock from legacy horizon if not provided
  const activeDay = day ?? (value === 'EOW' ? 'FRIDAY' : undefined);
  const activeTimeBlock = timeBlock ?? (value === 'EOW' ? 'EOD' : (value as CompletionTimeBlock));

  function handleDaySelect(d: CompletionDay) {
    if (disabled) return;
    const newHorizon = computeLegacyHorizon(d, activeTimeBlock);
    onChange(newHorizon);
    onDayTimeChange?.({ day: d, timeBlock: activeTimeBlock, horizon: newHorizon });
  }

  function handleTimeBlockSelect(tb: CompletionTimeBlock) {
    if (disabled) return;
    const newHorizon = computeLegacyHorizon(activeDay, tb);
    onChange(newHorizon);
    onDayTimeChange?.({ day: activeDay, timeBlock: tb, horizon: newHorizon });
  }

  const pillBase = [
    'flex-1 py-2 border-none text-label uppercase tracking-[0.04em] font-medium',
    'bg-surface-container text-on-surface-variant',
    'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
    'border-r border-r-outline-variant last:border-r-0',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-container-high active:translate-y-px',
  ].join(' ');

  const activePill = 'bg-accent text-white';

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Completion horizon">
      {/* Day row */}
      <div>
        <div className="text-small font-medium uppercase tracking-[0.04em] text-muted mb-1">Day</div>
        <div className="flex rounded-sm overflow-hidden border border-outline-variant">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={disabled}
              onClick={() => { handleDaySelect(d.value); }}
              aria-pressed={activeDay === d.value}
              className={`${pillBase} ${activeDay === d.value ? activePill : ''}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time block row */}
      <div>
        <div className="text-small font-medium uppercase tracking-[0.04em] text-muted mb-1">By when</div>
        <div className="flex rounded-sm overflow-hidden border border-outline-variant">
          {TIME_BLOCKS.map((tb) => (
            <button
              key={tb.value}
              type="button"
              disabled={disabled}
              onClick={() => { handleTimeBlockSelect(tb.value); }}
              aria-pressed={activeTimeBlock === tb.value}
              className={`${pillBase} ${activeTimeBlock === tb.value ? activePill : ''}`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

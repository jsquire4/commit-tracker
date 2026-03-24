import { useState } from 'react';
import Button from '@/components/Button';
import { useSaveReflection, type PersonalReflectionRequest } from '@/api/reflections.api';

const MAX_CHARS = 500;

type AlignmentSignal = 'CLOSER' | 'SAME' | 'FURTHER';

interface AlignmentOption {
  signal: AlignmentSignal;
  label: string;
  subtitle: string;
  selectedClass: string;
  borderClass: string;
  checkColor: string;
}

const ALIGNMENT_OPTIONS: AlignmentOption[] = [
  {
    signal: 'CLOSER',
    label: 'Closer to my goals',
    subtitle: 'This week moved me forward on what matters most',
    selectedClass: 'bg-accent/10 border-accent',
    borderClass: 'border-accent/30 bg-accent/5',
    checkColor: 'text-accent',
  },
  {
    signal: 'SAME',
    label: 'About the same',
    subtitle: 'Steady progress — holding the line',
    selectedClass: 'bg-surface-container border-on-surface-variant',
    borderClass: 'border-outline-variant bg-surface-container',
    checkColor: 'text-on-surface-variant',
  },
  {
    signal: 'FURTHER',
    label: 'Further from my goals',
    subtitle: 'This week pulled me away from what I planned',
    selectedClass: 'bg-warning/10 border-warning',
    borderClass: 'border-warning/30 bg-warning/5',
    checkColor: 'text-warning',
  },
];

interface PersonalReflectionStepProps {
  cycleId: string;
  onComplete: () => void;
}

export function PersonalReflectionStep({ cycleId, onComplete }: PersonalReflectionStepProps) {
  const [selectedSignal, setSelectedSignal] = useState<AlignmentSignal | null>(null);
  const [learningNote, setLearningNote] = useState('');
  const saveMutation = useSaveReflection();

  const remaining = MAX_CHARS - learningNote.length;
  const isOverLimit = remaining < 0;

  async function handleSubmit() {
    if (!selectedSignal) return;

    const req: PersonalReflectionRequest = {
      cycleId,
      alignmentSignal: selectedSignal,
      ...(learningNote.trim() ? { learningNote: learningNote.trim() } : {}),
    };

    try {
      await saveMutation.mutateAsync(req);
      onComplete();
    } catch {
      // error displayed via saveMutation.isError below
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="personal-reflection-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm animate-fade-up"
    >
      <div className="w-full max-w-lg mx-4 bg-surface-lowest rounded-sm shadow-xl border border-outline-variant flex flex-col gap-6 p-8">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 id="personal-reflection-heading" className="font-serif text-3xl tracking-tight text-on-surface font-normal">
            Close Your Week
          </h2>
          <p className="text-body text-on-surface-variant">
            Take a moment to reflect on your week
          </p>
        </div>

        {/* Alignment signal cards */}
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="How did this week feel?">
          <p className="text-sm font-medium text-on-surface-variant">
            How did this week move you relative to your goals?
          </p>
          {ALIGNMENT_OPTIONS.map((opt) => {
            const isSelected = selectedSignal === opt.signal;
            return (
              <button
                key={opt.signal}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => { setSelectedSignal(opt.signal); }}
                className={[
                  'w-full flex items-start gap-4 p-4 rounded-sm border-2 text-left',
                  'transition-all duration-[150ms] ease-[var(--ease-standard)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  'cursor-pointer',
                  isSelected ? opt.selectedClass : opt.borderClass,
                ].join(' ')}
              >
                {/* Radio indicator */}
                <span
                  className={[
                    'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-[150ms]',
                    isSelected ? 'border-current' : 'border-outline-variant',
                    isSelected ? opt.checkColor : 'text-muted',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-current" />
                  )}
                </span>

                {/* Text */}
                <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={[
                    'text-title font-medium leading-snug',
                    isSelected ? 'text-on-surface' : 'text-on-surface-variant',
                  ].join(' ')}>
                    {opt.label}
                  </span>
                  <span className="text-small text-on-surface-variant leading-snug">
                    {opt.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Learning note */}
        <div className="flex flex-col gap-1">
          <label htmlFor="learning-note" className="text-sm font-medium text-on-surface-variant">
            What's one thing you learned or gained this week?{' '}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="learning-note"
            value={learningNote}
            onChange={(e) => { setLearningNote(e.target.value); }}
            maxLength={MAX_CHARS}
            rows={3}
            placeholder="A lesson, a win, an unexpected discovery…"
            className={[
              'w-full bg-transparent border-0 border-b-[1.5px] px-0 py-2 text-[13px] text-on-surface resize-y',
              'placeholder:text-muted',
              'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
              'focus:outline-none',
              isOverLimit
                ? 'border-b-error focus:border-b-error'
                : 'border-b-outline-variant focus:border-b-accent',
            ].join(' ')}
            aria-describedby="learning-note-counter"
          />
          <p
            id="learning-note-counter"
            className={[
              'text-[11px] text-right tabular-nums',
              isOverLimit ? 'text-error font-medium' : 'text-muted',
            ].join(' ')}
          >
            {remaining} characters remaining
          </p>
        </div>

        {/* Error */}
        {saveMutation.isError && (
          <p role="alert" className="text-body text-error">
            Could not save your reflection. Please try again.
          </p>
        )}

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!selectedSignal || isOverLimit}
          loading={saveMutation.isPending}
          onClick={() => { void handleSubmit(); }}
        >
          {saveMutation.isPending ? 'Saving\u2026' : 'Finish Week'}
        </Button>
      </div>
    </div>
  );
}

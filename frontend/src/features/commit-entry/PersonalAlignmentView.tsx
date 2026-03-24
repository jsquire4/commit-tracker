import type { GrowthArea } from '@/types';
import Button from '@/components/Button';

interface PersonalAlignmentViewProps {
  growthAreas: GrowthArea[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onBack: () => void;
  onSave: () => void;
  isPending: boolean;
  isEdit: boolean;
}

export function PersonalAlignmentView({
  growthAreas,
  selectedIds,
  onChange,
  onBack,
  onSave,
  isPending,
  isEdit,
}: PersonalAlignmentViewProps) {
  const activeAreas = growthAreas.filter((a) => a.isActive);

  function handleToggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Body */}
      <div className="flex-1 overflow-y-auto px-7 py-6 scrollbar-thin">
        <div className="space-y-6">
          {/* Prompt */}
          <div>
            <h2 className="font-serif text-2xl text-on-surface font-normal tracking-[-0.01em] leading-snug">
              Does this advance any of your growth areas?
            </h2>
            <p className="mt-1.5 text-body text-on-surface-variant">
              Select any that apply — this helps build your professional story
            </p>
          </div>

          {activeAreas.length === 0 ? (
            /* Empty state */
            <div className="rounded-sm bg-surface-container-low border border-outline-variant p-5 text-center">
              <p className="text-body text-on-surface-variant">
                Set up your growth areas in{' '}
                <span className="font-medium text-on-surface">My Story</span>{' '}
                to start tracking personal alignment
              </p>
            </div>
          ) : (
            /* Growth area chips */
            <div className="flex flex-wrap gap-2.5">
              {activeAreas.map((area) => {
                const isSelected = selectedIds.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => { handleToggle(area.id); }}
                    className={[
                      'inline-flex items-center px-4 py-2 rounded-full text-body font-medium',
                      'transition-all duration-[var(--duration-standard)] ease-[var(--ease-standard)]',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      isSelected
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-surface-container text-on-surface-variant border border-transparent hover:bg-surface-container-high hover:text-on-surface',
                    ].join(' ')}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 mr-1.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {area.label}
                  </button>
                );
              })}
            </div>
          )}

          {selectedIds.length > 0 && activeAreas.length > 0 && (
            <p className="text-small text-muted">
              {selectedIds.length} area{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-outline-variant bg-surface-lowest">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="text-sm text-muted hover:text-on-surface-variant transition-colors duration-[150ms] disabled:opacity-50"
        >
          ← Back
        </button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          loading={isPending}
          disabled={isPending}
          onClick={onSave}
          className="flex-1 max-w-[260px]"
        >
          {isEdit ? 'Save Changes' : 'Save Commitment'}
        </Button>
      </div>
    </div>
  );
}

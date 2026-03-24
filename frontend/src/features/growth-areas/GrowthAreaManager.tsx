import { useState, useRef, useEffect } from 'react';
import { useGrowthAreas, useCreateGrowthArea, useDeleteGrowthArea } from '@/hooks/useGrowthAreas';

const MAX_GROWTH_AREAS = 5;

export function GrowthAreaManager() {
  const { data: growthAreas = [], isLoading } = useGrowthAreas();
  const createMutation = useCreateGrowthArea();
  const deleteMutation = useDeleteGrowthArea();

  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const activeAreas = growthAreas.filter((a) => a.isActive);
  const atMax = activeAreas.length >= MAX_GROWTH_AREAS;

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  function handleAddClick() {
    if (atMax) return;
    setIsAdding(true);
  }

  function handleCancel() {
    setIsAdding(false);
    setInputValue('');
  }

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      handleCancel();
      return;
    }
    createMutation.mutate(
      { label: trimmed },
      {
        onSuccess: () => {
          setInputValue('');
          setIsAdding(false);
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  if (isLoading) {
    return (
      <div className="bg-surface-lowest rounded-sm p-4">
        <div className="h-4 w-32 bg-surface-container-low rounded animate-pulse mb-3" />
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-surface-container-low rounded-full animate-pulse" />
          <div className="h-7 w-24 bg-surface-container-low rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-lowest rounded-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
          Growth Areas
        </span>
        <span className="text-small text-muted">
          {activeAreas.length}/{MAX_GROWTH_AREAS}
        </span>
      </div>

      {/* Empty state */}
      {activeAreas.length === 0 && !isAdding && (
        <p className="text-small text-muted italic mb-3">
          Add up to 5 personal growth areas to track how your work connects to your development
        </p>
      )}

      {/* Chips */}
      {activeAreas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {activeAreas.map((area) => (
            <span
              key={area.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-small font-medium"
            >
              {area.label}
              <button
                type="button"
                aria-label={`Remove ${area.label}`}
                onClick={() => handleDelete(area.id)}
                disabled={deleteMutation.isPending}
                className="text-accent/50 hover:text-accent transition-colors leading-none -mr-0.5 disabled:opacity-40"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Inline add input */}
      {isAdding && (
        <div className="flex items-center gap-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Leadership, Systems thinking…"
            maxLength={80}
            disabled={createMutation.isPending}
            className="flex-1 bg-transparent border-b border-on-surface-variant/30 focus:border-accent outline-none text-small text-on-surface placeholder:text-muted py-0.5 transition-colors disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleCancel}
            className="text-small text-muted hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add button */}
      {!isAdding && (
        <div className="relative group inline-block">
          <button
            type="button"
            onClick={handleAddClick}
            disabled={atMax}
            className="text-small text-accent hover:text-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add growth area
          </button>
          {atMax && (
            <span className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-surface-container text-small text-on-surface rounded shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Maximum of {MAX_GROWTH_AREAS} growth areas reached
            </span>
          )}
        </div>
      )}
    </div>
  );
}

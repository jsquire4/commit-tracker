import Button from '@/components/Button';

interface ReconciliationBottomBarProps {
  reconciledCount: number;
  totalCommitments: number;
  allReconciled: boolean;
  onComplete: () => void;
  loading?: boolean;
}

export function ReconciliationBottomBar({
  reconciledCount,
  totalCommitments,
  allReconciled,
  onComplete,
  loading = false,
}: ReconciliationBottomBarProps) {
  const pct =
    totalCommitments > 0
      ? Math.round((reconciledCount / totalCommitments) * 100)
      : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-white/[0.92] backdrop-blur-[20px]"
    >
      <div className="max-w-[960px] mx-auto px-8 py-3 flex items-center justify-between">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-[120px] h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-[var(--ease-standard)]"
              style={{
                width: `${pct}%`,
                background: allReconciled ? 'var(--color-accent)' : 'var(--color-warning)',
              }}
            />
          </div>
          <span className="text-sm text-on-surface-variant font-medium tabular-nums">
            {reconciledCount} of {totalCommitments} reconciled
          </span>
        </div>

        {/* Action */}
        <Button
          variant={allReconciled ? 'primary' : 'secondary'}
          size="lg"
          disabled={!allReconciled || loading}
          loading={loading}
          onClick={onComplete}
        >
          {loading ? 'Submitting\u2026' : 'Complete Reconciliation'}
        </Button>
      </div>
    </div>
  );
}

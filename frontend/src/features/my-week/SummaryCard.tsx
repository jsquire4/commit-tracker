export function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-surface-lowest p-3">
      <dt className="text-small font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-headline font-bold mt-0.5 text-on-surface tabular-nums">{value}</dd>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

export function LoadingSpinner({ size = 'md', fullPage = false, label }: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label ?? 'Loading'}>
      <div
        className={`${sizeClasses[size]} rounded-full border-surface-container border-t-accent animate-spin`}
      />
      {label && <span className="text-body text-on-surface-variant">{label}</span>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

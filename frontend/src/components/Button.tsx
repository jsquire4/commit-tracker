import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'dashed';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-small',
  md: 'px-4 py-2 text-body',
  lg: 'px-6 py-2.5 text-body',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-dark focus-visible:outline-accent',
  secondary:
    'bg-surface-container-high text-on-surface hover:bg-surface-container focus-visible:outline-on-surface-variant',
  tertiary:
    'bg-transparent text-accent hover:underline focus-visible:outline-accent',
  dashed:
    'bg-transparent text-on-surface-variant border border-dashed border-outline-variant hover:border-accent hover:text-accent focus-visible:outline-accent',
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-sm font-medium',
        'transition-colors duration-[150ms] ease-[var(--ease-standard,cubic-bezier(0.25,0.1,0.25,1))]',
        'active:translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        sizeClasses[size],
        variantClasses[variant],
        isDisabled ? 'opacity-50 cursor-not-allowed active:translate-y-0' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <span className="flex-shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}

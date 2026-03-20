import { useId } from 'react';

interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date';
  textarea?: boolean;
  rows?: number;
  maxLength?: number;
  className?: string;
  required?: boolean;
  name?: string;
  disabled?: boolean;
}

export default function Input({
  label,
  error,
  helperText,
  value,
  onChange,
  placeholder,
  type = 'text',
  textarea = false,
  rows = 3,
  maxLength,
  className = '',
  required = false,
  name,
  disabled = false,
}: InputProps) {
  const id = useId();
  const descId = `${id}-desc`;
  const charCount = value?.length ?? 0;
  const hasDescription = Boolean(error || helperText);

  const sharedClasses = [
    'w-full bg-transparent border-0 border-b-2 px-0 py-2',
    'text-body text-on-surface placeholder:text-muted',
    'transition-colors duration-[200ms] ease-[var(--ease-standard,cubic-bezier(0.25,0.1,0.25,1))]',
    'focus:outline-none',
    error
      ? 'border-b-error focus:border-b-error'
      : 'border-b-outline-variant focus:border-b-accent',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium"
        >
          {label}
          {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}

      {textarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasDescription ? descId : undefined}
          disabled={disabled}
          className={`${sharedClasses} resize-y`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasDescription ? descId : undefined}
          disabled={disabled}
          className={sharedClasses}
        />
      )}

      <div className="flex justify-between items-center min-h-[1.25rem]">
        {error ? (
          <span id={descId} className="text-small text-error" role="alert">{error}</span>
        ) : helperText ? (
          <span id={descId} className="text-small text-muted">{helperText}</span>
        ) : (
          <span />
        )}

        {maxLength != null && (
          <span
            className={`text-small tabular-nums ${
              charCount >= maxLength ? 'text-error' : 'text-muted'
            }`}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

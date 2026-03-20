const MAX_CHARS = 500;

interface ChangeReasonCaptureProps {
  value: string;
  onChange: (s: string) => void;
  onBlur?: () => void;
  required: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChangeReasonCapture({
  value,
  onChange,
  onBlur,
  required,
  disabled = false,
  placeholder = 'Describe what happened and the reason for any deviation from plan\u2026',
}: ChangeReasonCaptureProps) {
  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-on-surface-variant">
        What changed and why?
        {required && (
          <span className="ml-1 text-error" aria-label="required">
            *
          </span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        maxLength={MAX_CHARS}
        rows={2}
        placeholder={placeholder}
        className={[
          'w-full bg-transparent border-0 border-b-[1.5px] px-0 py-2 text-[13px] text-on-surface resize-y',
          'placeholder:text-muted',
          'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
          'focus:outline-none',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          isOverLimit
            ? 'border-b-error focus:border-b-error'
            : 'border-b-outline-variant focus:border-b-accent',
        ].join(' ')}
        aria-describedby="change-reason-counter"
      />
      <p
        id="change-reason-counter"
        className={[
          'text-[11px] text-right tabular-nums',
          isOverLimit ? 'text-error font-medium' : 'text-muted',
        ].join(' ')}
      >
        {remaining} characters remaining
      </p>
    </div>
  );
}

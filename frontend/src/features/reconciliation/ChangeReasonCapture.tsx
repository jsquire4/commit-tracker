const MAX_CHARS = 500;

interface ChangeReasonCaptureProps {
  value: string;
  onChange: (s: string) => void;
  onBlur?: () => void;
  required: boolean;
  disabled?: boolean;
}

export function ChangeReasonCapture({
  value,
  onChange,
  onBlur,
  required,
  disabled = false,
}: ChangeReasonCaptureProps) {
  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        What changed and why?
        {required && (
          <span className="ml-1 text-red-500" aria-label="required">
            *
          </span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        maxLength={MAX_CHARS}
        rows={3}
        placeholder="Describe what happened and the reason for any deviation from plan…"
        className={[
          'w-full rounded border px-3 py-2 text-sm resize-y',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white text-gray-900',
          isOverLimit ? 'border-red-400' : 'border-gray-300',
        ].join(' ')}
        aria-describedby="change-reason-counter"
      />
      <p
        id="change-reason-counter"
        className={[
          'text-xs text-right',
          isOverLimit ? 'text-red-500 font-medium' : 'text-gray-500',
        ].join(' ')}
      >
        {remaining} characters remaining
      </p>
    </div>
  );
}

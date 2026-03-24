import type { ReactNode } from 'react';

const SELECT_ARROW_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 0 center',
};

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function SelectField({ label, value, onChange, required, disabled, children }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        disabled={disabled}
        className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-body text-on-surface focus:outline-none focus:border-b-accent cursor-pointer appearance-none transition-colors duration-[200ms] disabled:opacity-50"
        style={SELECT_ARROW_STYLE}
      >
        {children}
      </select>
    </div>
  );
}

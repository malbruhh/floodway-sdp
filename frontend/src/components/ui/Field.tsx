import React, { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  help?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
}

/** A labelled text input at 16px (no iOS zoom) with the error and help text tied to it for screen readers. */
export function Field({ label, value, onChange, error, help, type = 'text', autoComplete, inputMode, placeholder }: Props) {
  const id = useId();
  const note = error ? `${id}-err` : help ? `${id}-help` : undefined;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={note}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-12 w-full rounded-ctl bg-surface px-3 text-base text-ink placeholder:text-muted ring-1 ${error ? 'ring-2 ring-danger' : 'ring-control'}`}
      />
      {error ? <p id={`${id}-err`} role="alert" className="text-sm font-medium text-danger">{error}</p> : help ? <p id={`${id}-help`} className="text-sm text-muted">{help}</p> : null}
    </div>
  );
}

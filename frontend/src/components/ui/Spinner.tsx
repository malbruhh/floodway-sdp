import React from 'react';

/** Small ring for pending buttons. Decorative: the button text says what is happening. */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin-soft rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />;
}

/** Thin indeterminate bar for page-level pending work (loading, saving). */
export function ProgressBar({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="progressbar" aria-label={label} className="h-0.5 w-full overflow-hidden bg-raised">
      <div className="h-full w-1/3 animate-indeterminate bg-action" />
    </div>
  );
}

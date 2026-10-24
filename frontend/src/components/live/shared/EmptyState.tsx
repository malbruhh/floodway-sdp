import type { LucideIcon } from 'lucide-react';
import { btnPrimary, cardTitle } from './ui';

interface Props {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, hint, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-control bg-surface px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-raised">
        <Icon className="h-5 w-5 text-muted" aria-hidden="true" />
      </span>
      <p className={cardTitle}>{title}</p>
      {hint && <p className="max-w-[40ch] text-sm/5 text-muted">{hint}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className={`${btnPrimary} mt-2`}>
          {action.label}
        </button>
      )}
    </div>
  );
}

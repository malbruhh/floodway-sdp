import { LayoutGrid, Maximize } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { interactive } from '../shared/ui';

export type ViewMode = 'focus' | 'grid';

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const MODES: { mode: ViewMode; label: string; icon: LucideIcon }[] = [
  { mode: 'focus', label: 'Focus', icon: Maximize },
  { mode: 'grid', label: 'Grid', icon: LayoutGrid },
];

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex shrink-0 rounded-ctl border border-line bg-surface p-1" role="group" aria-label="View mode">
      {MODES.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 @min-[760px]/main:min-h-9 text-sm/5 font-semibold ${interactive} ${value === mode ? 'bg-[#0958D9] text-white' : 'text-muted hover:bg-raised'}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

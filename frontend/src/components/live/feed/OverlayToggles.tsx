import { Rows3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { interactive } from '../shared/ui';

export interface OverlayState {
  roi: boolean;
  lines: boolean;
  mask: boolean;
  waterline: boolean;
}

export const DEFAULT_OVERLAYS: OverlayState = { roi: false, lines: true, mask: false, waterline: true };
const ITEMS: { key: keyof OverlayState; label: string; hint: string; icon: LucideIcon }[] = [
    { key: 'lines', label: 'Show level lines', hint: 'Normal, warning and danger lines and the waterline', icon: Rows3 },
  ];

interface Props {
  value: OverlayState;
  onChange: (next: OverlayState) => void;
}

/** One segmented row that never wraps. Labels show when the toolbar has room; icons with tooltips otherwise.
 *  Must sit inside an `@container/toolbar`. */
export function OverlayToggles({ value, onChange }: Props) {
  return (
    <div className="inline-flex shrink-0 rounded-ctl bg-raised p-1" role="group" aria-label="Feed overlays">
      {ITEMS.map(({ key, label, hint, icon: Icon }) => {
        const on = value[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={`${on ? 'Hide' : 'Show'}: ${hint}`}
            onClick={() => onChange({ ...value, lines: !on, waterline: !on })}
            className={`inline-flex min-h-11 min-w-11 items-center @min-[760px]/main:min-h-9 @min-[760px]/main:min-w-9 justify-center gap-1.5 rounded-lg px-2 text-sm/5 font-medium ${interactive} ${
              on ? 'bg-action text-white' : 'text-muted hover:bg-raised hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

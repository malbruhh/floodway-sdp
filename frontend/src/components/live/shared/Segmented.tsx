import { focusRing } from './ui';

interface Props<T extends string | number> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** 'tabs' for switching a list (role tablist), 'group' for a setting (pressed buttons). */
  kind?: 'tabs' | 'group';
}

/** iOS-style segmented control: a grey track with a white thumb that slides under the chosen segment.
 *  The thumb moves with transform only; motion is off under prefers-reduced-motion. Segments are 44px tall. */
export function Segmented<T extends string | number>({ options, value, onChange, label, kind = 'group' }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const tabs = kind === 'tabs';
  return (
    <div className="relative grid rounded-ctl bg-raised p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role={tabs ? 'tablist' : 'group'} aria-label={label}>
      <span
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-[10px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,.18)] transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
        aria-hidden="true"
      />
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role={tabs ? 'tab' : undefined}
            aria-selected={tabs ? on : undefined}
            aria-pressed={tabs ? undefined : on}
            onClick={() => onChange(o.id)}
            className={`relative z-10 min-h-11 whitespace-nowrap rounded-[10px] px-1 text-sm font-semibold ${focusRing} ${on ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

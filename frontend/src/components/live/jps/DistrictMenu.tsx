import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, MapPin } from 'lucide-react';

interface Props {
  value: string;
  districts: { name: string; count: number }[];
  total: number;
  onChange: (district: string) => void;
}

/** Same look as the header location picker: a pill button and a white popover list with a tick on the active row. */
export function DistrictMenu({ value, districts, total, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [{ name: 'all', label: 'All districts', count: total }, ...districts.map((d) => ({ name: d.name, label: d.name, count: d.count }))];
  const current = items.find((i) => i.name === value) ?? items[0];

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1677FF]" aria-hidden="true" />
        <span className="truncate">
          {current.label} ({current.count})
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
      </button>

      {open && (
        <div role="listbox" aria-label="District" className="absolute left-0 z-50 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
          <div className="border-b border-slate-100 px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">JPS Selangor districts</div>
          {items.map((i) => (
            <button
              key={i.name}
              type="button"
              role="option"
              aria-selected={i.name === value}
              onClick={() => {
                onChange(i.name);
                setOpen(false);
              }}
              className={`flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-50 ${
                i.name === value ? 'bg-blue-50/50 font-semibold text-[#1677FF]' : 'text-slate-700'
              }`}
            >
              <span>
                {i.label} ({i.count})
              </span>
              {i.name === value && <CheckCircle2 className="h-3.5 w-3.5 text-[#1677FF]" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

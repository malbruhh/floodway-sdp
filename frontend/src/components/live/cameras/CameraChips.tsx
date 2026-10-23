import { Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatDistance } from '../../../lib/vision/geo';
import { LEVEL_META } from '../../../lib/vision/levels';
import type { CameraWithDistance } from '../../../hooks/vision/useNearbyCameras';
import { interactive, num } from '../shared/ui';

interface Props {
  items: CameraWithDistance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

/** Phone: horizontal snap-scrolling camera picker. Bleeds to the screen edge, snaps with the page gutter. */
export function CameraChips({ items, selectedId, onSelect, onAdd }: Props) {
  const row = useRef<HTMLDivElement>(null);
  // Keep the chosen chip in view (a new or tapped-from-elsewhere camera can sit off-screen in the row).
  useEffect(() => {
    row.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [selectedId]);
  return (
    <div ref={row} className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] @min-[640px]/main:-mx-6 @min-[640px]/main:scroll-px-6 @min-[640px]/main:px-6" role="listbox" aria-label="Cameras" aria-orientation="horizontal">
      {items.map(({ camera, distanceKm }) => {
        const level = camera.online ? camera.reading?.level : undefined;
        const meta = level ? LEVEL_META[level] : null;
        const Icon = meta?.icon;
        const selected = camera.id === selectedId;
        return (
          <button
            key={camera.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(camera.id)}
            className={`min-h-14 w-44 shrink-0 snap-start rounded-ctl border px-3 py-2 text-left ${interactive} ${selected ? 'border-action/70 bg-advisory-bg shadow-sm' : 'border-line/70 bg-surface shadow-sm'}`}
          >
            <span className="block truncate text-sm/5 font-semibold text-ink">{camera.name}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs/4 text-muted">
              {Icon ? <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.text}`} aria-hidden="true" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />}
              <span className={meta ? `font-semibold ${meta.text}` : ''}>{camera.online ? (meta ? meta.label : 'Waiting') : 'Offline'}</span>
              <span aria-hidden="true">·</span>
              <span className={num}>{formatDistance(distanceKm)}</span>
            </span>
          </button>
        );
      })}
      <button type="button" onClick={onAdd} aria-label="Add my camera" className={`flex min-h-14 w-14 shrink-0 snap-start items-center justify-center rounded-ctl border border-dashed border-action/50 bg-advisory-bg text-link hover:bg-advisory-bg ${interactive}`}>
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

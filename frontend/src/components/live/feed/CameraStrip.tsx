import { camTag } from '../../../lib/vision/camTag';
import { LEVEL_META } from '../../../lib/vision/levels';
import type { Camera } from '../../../types/vision';
import { interactive, num } from '../shared/ui';
import { FeedThumb } from './FeedThumb';

interface Props {
  cameras: Camera[];
  allCameras: Camera[];
  selectedId: string | null;
  useScene: boolean;
  onSelect: (id: string) => void;
}

/** Thumbnail strip under the main feed for quick switching. Scrolls sideways; the right edge fades to show there is more. */
export function CameraStrip({ cameras, allCameras, selectedId, useScene, onSelect }: Props) {
  if (cameras.length < 2) return null;
  return (
    <div className="relative">
      <div className="relative flex snap-x gap-3 overflow-x-auto pb-2 pr-8 [scrollbar-width:thin]" role="listbox" aria-label="Switch camera" aria-orientation="horizontal">
        {cameras.map((camera) => {
          const selected = camera.id === selectedId;
          const level = camera.online ? camera.reading?.level : undefined;
          const meta = level ? LEVEL_META[level] : null;
          const Icon = meta?.icon;
          return (
            <button
              key={camera.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(camera.id)}
              className={`w-40 shrink-0 snap-start rounded-ctl border p-2 text-left ${interactive} ${selected ? 'border-action/70 bg-advisory-bg shadow-sm' : 'border-line/70 bg-surface hover:border-control'}`}
            >
              <FeedThumb camera={camera} useScene={useScene} />
              <span className="mt-2 flex items-center gap-1.5">
                {Icon ? <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.text}`} aria-hidden="true" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />}
                <span className={`${num} text-xs/4 font-semibold text-ink`}>{camTag(allCameras, camera.id)}</span>
                <span className="sr-only">{meta ? meta.label : 'Offline'}</span>
              </span>
              <span className="block truncate text-xs/4 text-muted">{camera.name}</span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ground to-transparent" aria-hidden="true" />
    </div>
  );
}

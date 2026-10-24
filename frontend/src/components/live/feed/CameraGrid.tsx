import { camTag } from '../../../lib/vision/camTag';
import { pct } from '../../../lib/vision/format';
import type { Camera } from '../../../types/vision';
import { OfflineChip, StatusChip } from '../shared/StatusChip';
import { card, interactive, num } from '../shared/ui';
import { FeedViewer } from './FeedViewer';
import type { OverlayState } from './OverlayToggles';

interface Props {
  cameras: Camera[];
  allCameras: Camera[];
  useScene: boolean;
  overlays: OverlayState;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Every visible camera at once: 1 column on phones, 2 on desktop, 3 when the centre column is very wide. */
export function CameraGrid({ cameras, allCameras, useScene, overlays, selectedId, onSelect }: Props) {
  return (
    <div className="@container/grid">
      <ul className="grid grid-cols-1 gap-4 @min-[520px]/grid:grid-cols-2 @min-[840px]/grid:grid-cols-3" aria-label="All cameras">
        {cameras.map((camera) => {
          const reading = camera.online ? camera.reading : null;
          return (
            <li key={camera.id} className="flex">
              <button
                type="button"
                onClick={() => onSelect(camera.id)}
                aria-label={`Open ${camera.name}`}
                className={`${card} flex w-full flex-col p-2 text-left ${interactive} ${selectedId === camera.id ? 'border-action ring-1 ring-action' : 'hover:border-control'}`}
              >
                <FeedViewer camera={camera} tag={camTag(allCameras, camera.id)} useScene={useScene} overlays={overlays} compact />
                <span className="flex flex-1 flex-col gap-2 px-2 pb-1 pt-3">
                  <span className="truncate text-sm/5 font-semibold text-ink" title={camera.name}>{camera.name}</span>
                  <span className="flex items-center gap-2">
                    {reading ? (
                      <>
                        <StatusChip level={reading.level} />
                        <span className={`${num} text-xs/4 font-medium text-muted`}>{pct(reading.water_ratio)} up the bank</span>
                      </>
                    ) : (
                      <OfflineChip label={camera.online ? 'WAITING' : 'OFFLINE'} />
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { MapPin } from 'lucide-react';
import { causeLine, plainCameraName } from '../../../lib/home';
import { useCaptureCycle } from '../../../hooks/vision/useCaptureCycle';
import { sourceLabel } from '../../../lib/vision/describe';
import { formatDistance } from '../../../lib/vision/geo';
import { pct } from '../../../lib/vision/format';
import type { Camera } from '../../../types/vision';
import { OfflineChip, StatusChip } from '../shared/StatusChip';
import { card, heading, num } from '../shared/ui';
import { CountdownRing } from './CountdownRing';

/** Name and meta on the left; level, water % and the countdown on the right. Stacks into two rows when narrow. */
export function FeedHeader({ camera, distanceKm }: { camera: Camera; distanceKm: number }) {
  const cycle = useCaptureCycle(camera);
  const reading = camera.online ? camera.reading : null;
  return (
    <header className={`${card} @container/fh px-4 py-3 @min-[760px]/main:px-5`}>
      <div className="flex flex-col gap-3 @min-[520px]/fh:flex-row @min-[520px]/fh:items-center @min-[520px]/fh:justify-between">
        <div className="min-w-0">
          <h2 className={`${heading} truncate text-lg/7 @min-[520px]/fh:text-xl/7`} title={camera.name}>{plainCameraName(camera.name)}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm/5 text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className={num}>{formatDistance(distanceKm)}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{sourceLabel(camera)}</span>
          </p>
          {reading && <p className="mt-1 text-sm/5 text-ink" role="status">{causeLine(reading.level, camera)}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 @min-[520px]/fh:justify-end @min-[520px]/fh:gap-4">
          <div className="flex items-center gap-3">
            {reading ? <StatusChip level={reading.level} size="md" /> : <OfflineChip label={camera.online ? 'WAITING' : 'OFFLINE'} size="md" />}
            {reading && (
              <p className="whitespace-nowrap leading-none">
                <span className={`${num} block text-lg/6 font-semibold text-ink`}>{pct(reading.water_ratio)}</span>
                <span className="block text-xs/4 text-muted">up the bank</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 border-l border-line pl-3 @min-[520px]/fh:pl-4">
            <span className="hidden text-xs/4 text-muted @min-[340px]/fh:inline">Next<br />capture</span>
            <CountdownRing cycle={cycle} size={44} />
          </div>
        </div>
      </div>
    </header>
  );
}

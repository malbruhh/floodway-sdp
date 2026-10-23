import { useCaptureCycle } from '../../../hooks/vision/useCaptureCycle';
import { sourceLabel } from '../../../lib/vision/describe';
import { formatDistance } from '../../../lib/vision/geo';
import { pct, timeAgo } from '../../../lib/vision/format';
import { LEVEL_META } from '../../../lib/vision/levels';
import { FeedThumb } from '../feed/FeedThumb';
import { OfflineChip, StatusChip } from '../shared/StatusChip';
import { Sparkline } from '../shared/Sparkline';
import { interactive, num } from '../shared/ui';
import type { Camera, Reading } from '../../../types/vision';
import { WeatherChip } from '../../weather/WeatherChip';
import type { PointWeather } from '../../../services/weather';

interface Props {
  camera: Camera;
  distanceKm: number;
  history: Reading[];
  selected: boolean;
  useScene: boolean;
  onSelect: () => void;
  weather?: PointWeather;
}

export function cycleStatus(camera: Camera, phase: string, secondsLeft: number): string {
  if (phase === 'disconnected') return 'Server unreachable, retrying';
  if (!camera.online) return camera.last_frame_at ? `Offline for ${timeAgo(camera.last_frame_at).replace(' ago', '')}` : 'Offline · no frames yet';
  if (phase === 'stale') return 'Stale feed';
  if (phase === 'analysing') return 'Analysing…';
  if (camera.feed_refresh_s > 0) return `Updated ${timeAgo(camera.last_frame_at)}`;
  return `Next capture in ${secondsLeft}s`;
}

/** Fixed structure so every card has the same height: name row, thumbnail + reading row, status row. */
export function CameraCard({ camera, distanceKm, history, selected, useScene, onSelect, weather }: Props) {
  const cycle = useCaptureCycle(camera);
  const reading = camera.online ? camera.reading : null;
  const meta = reading ? LEVEL_META[reading.level] : null;
  const status = cycleStatus(camera, cycle.phase, cycle.secondsLeft);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`block w-full rounded-card border p-3 text-left ${interactive} ${
        selected ? 'border-action bg-blue-50/50 ring-1 ring-[#1677FF]' : 'border-line bg-surface hover:border-control hover:bg-slate-50/60'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate text-base/6 font-semibold text-ink" title={camera.name}>{camera.name}</span>
        <span className={`${num} shrink-0 text-xs/4 text-muted`}>{formatDistance(distanceKm)}</span>
      </span>
      <span className="mt-2 flex gap-3">
        <FeedThumb camera={camera} useScene={useScene} className="h-16 w-28 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col justify-between">
          <span className="block">{reading ? <StatusChip level={reading.level} /> : <OfflineChip label={camera.online ? 'WAITING' : 'OFFLINE'} />}</span>
          <span className="flex items-end justify-between gap-2">
            <span className="leading-none">
              <span className={`${num} block text-sm/5 font-semibold ${reading ? 'text-ink' : 'text-muted'}`}>{reading ? pct(reading.water_ratio) : '--'}</span>
              <span className="block text-xs/4 text-muted">up the bank</span>
            </span>
            <Sparkline values={reading ? history.slice(-20).map((r) => r.water_ratio) : []} color={meta?.hex ?? '#94A3B8'} width={56} height={24} className="shrink-0" />
          </span>
        </span>
      </span>
      {weather && <span className="mt-2 block"><WeatherChip w={weather} /></span>}
      <span className="mt-2 flex items-center justify-between gap-2 border-t border-rule pt-2 text-xs/4">
        <span className={`truncate ${cycle.phase === 'stale' ? 'font-semibold text-amber-800' : 'text-muted'}`}>{status}</span>
        <span className="shrink-0 text-muted">{sourceLabel(camera)}</span>
      </span>
    </button>
  );
}

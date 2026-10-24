import { Loader2 } from 'lucide-react';
import { useCaptureCycle } from '../../../hooks/vision/useCaptureCycle';
import { timeAgo } from '../../../lib/vision/format';
import type { Camera } from '../../../types/vision';
import { card, num } from '../shared/ui';

/** The automatic cycle, made visible: what just happened and what happens next. No manual controls.
 *  The level chip and countdown ring live in the feed header; this strip adds the run details. */
export function CaptureStrip({ camera }: { camera: Camera }) {
  const cycle = useCaptureCycle(camera);
  const reading = camera.reading;

  let label = 'Capturing automatically'; // the countdown itself is the ring in the feed header
  if (cycle.phase === 'disconnected') label = 'Server unreachable. Retrying automatically.';
  else if (cycle.phase === 'offline') label = 'Camera offline. Retrying automatically.';
  else if (cycle.phase === 'stale') label = 'Waiting for a fresh frame';
  else if (cycle.phase === 'analysing') label = 'Analysing a burst of frames…';

  const detail = !camera.online
    ? camera.last_frame_at ? `last frame ${timeAgo(camera.last_frame_at)}` : 'no frames yet'
    : camera.feed_refresh_s > 0
      ? `source updates every ${Math.round(camera.feed_refresh_s / 60)} min · frame ${timeAgo(camera.last_frame_at)}`
      : reading ? `last analysed ${timeAgo(reading.timestamp)} · ${reading.frames_analyzed} frames in ${reading.window_seconds.toFixed(1)}s` : 'waiting for the first result';

  return (
    <div className={`${card} flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 @min-[760px]/main:px-5`}>
      <p className="flex items-center gap-2 text-sm/5 font-semibold text-ink">
        {cycle.phase === 'analysing' && <Loader2 className="h-4 w-4 text-link motion-safe:animate-spin" aria-hidden="true" />}
        {label}
      </p>
      {/* Announce phase changes only, never the per-second countdown. */}
      <span className="sr-only" aria-live="polite">{cycle.phase === 'waiting' ? '' : label}</span>
      <p className={`${num} text-xs/4 text-muted`}>{detail}</p>
      {camera.source_type === 'upload' && <p className="basis-full text-xs/4 text-muted">Uploaded photo. It does not change, so the reading repeats. Use a stream or snapshot URL to watch live water.</p>}
      {camera.source_type === 'synthetic' && <p className="basis-full text-xs/4 text-muted">Sample footage. The water overlay is simulated, not a real camera.</p>}
    </div>
  );
}

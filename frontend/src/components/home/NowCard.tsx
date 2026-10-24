import React from 'react';
import { Link } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { useFlash } from '../../hooks/useFlash';
import { cameraPlace, isSampleCamera } from '../../lib/home';
import { pct } from '../../lib/vision/format';
import type { Camera } from '../../types/vision';
import { FeedThumb } from '../live/feed/FeedThumb';
import { card } from '../../styles/tokens';

const TREND = { rising: 'Rising', steady: 'Steady', falling: 'Falling' } as const;

/** "Now": the most urgent camera, its picture and how the water is moving. Opens that camera full screen on the Cameras page. */
export function NowCard({ camera, useScene }: { camera: Camera | null; useScene: boolean }) {
  const r = camera?.reading;
  const flash = useFlash(r ? Math.round(r.water_ratio * 100) : null);
  if (!camera || !r) return <div className={`${card} p-4 text-sm text-muted`}>No camera reading yet.</div>;
  const place = cameraPlace(camera.name);
  return (
    <div className={`${card} grid gap-2.5 p-4`}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <b className={`rounded-ctl px-1 -mx-1 text-[30px]/[1.1] font-bold tracking-tight ${flash ? 'animate-flash' : ''}`}>{pct(r.water_ratio)}</b>
        <span className="text-[17px] font-semibold">{TREND[r.trend]}</span>
      </div>
      <p className="text-sm text-muted">of the way up the river bank at {place}</p>
      <Link to={`/live?camera=${encodeURIComponent(camera.id)}`} className="relative block overflow-hidden rounded-media" aria-label={`Open the ${place} camera full screen`}>
        <FeedThumb camera={camera} useScene={useScene} className="aspect-video w-full rounded-media" />
        {isSampleCamera(camera) && <span className="absolute left-2 top-2 rounded-full bg-surface/95 px-2 py-0.5 text-xs font-semibold">Sample camera</span>}
        <span className="absolute bottom-2 right-2 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink/75 px-3 text-sm font-medium text-white">
          <Maximize2 className="h-4 w-4" aria-hidden="true" /> Full screen
        </span>
      </Link>
    </div>
  );
}

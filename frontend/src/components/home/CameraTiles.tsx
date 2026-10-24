import React from 'react';
import { Link } from 'react-router-dom';
import { cameraPlace, isSampleCamera } from '../../lib/home';
import { levelRank } from '../../lib/vision/levels';
import type { Camera } from '../../types/vision';
import { FeedThumb } from '../live/feed/FeedThumb';
import { Skeleton } from '../live/shared/Skeleton';
import { OfflineChip, StatusChip } from '../live/shared/StatusChip';

interface Props { loading: boolean; cameras: Camera[]; useScene: boolean }

const rank = (c: Camera) => (c.online && c.reading ? levelRank(c.reading.level) : -1);

/** "Cameras near you": a two-column grid, most urgent first. Each tile opens the Cameras page. */
export function CameraTiles({ loading, cameras, useScene }: Props) {
  const sorted = [...cameras].sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  return (
    <section aria-labelledby="cams-title" className="grid gap-2.5">
      <h2 id="cams-title" className="flex items-center text-base font-semibold">
        Cameras near you
        <Link to="/live" className="ml-auto flex min-h-11 items-center text-sm font-medium text-link">See all</Link>
      </h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : sorted.length === 0 ? (
        <p className="rounded-card bg-surface p-4 text-sm text-muted ring-1 ring-line">No cameras yet. Add one on the Cameras page and it shows up here.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5">
          {sorted.slice(0, 6).map((c, i) => {
            const r = c.online ? c.reading : null;
            return (
              <li key={c.id} className="animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
                <Link to={`/live?camera=${encodeURIComponent(c.id)}`} className="grid gap-1 text-left text-sm">
                  <span className="relative block">
                    <FeedThumb camera={c} useScene={useScene} className="aspect-[4/3] w-full rounded-media" />
                    {isSampleCamera(c) && <span className="absolute left-1.5 top-1.5 rounded-full bg-surface/95 px-2 py-0.5 text-xs font-semibold">Sample</span>}
                  </span>
                  <span className="truncate font-medium">{cameraPlace(c.name)}</span>
                  {r ? <StatusChip level={r.level} /> : <OfflineChip label={c.online ? 'Waiting' : 'Offline'} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

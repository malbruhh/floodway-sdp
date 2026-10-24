import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatKm, formatMin, percentOf, textOr } from '../../lib/format';
import { nearestOpenShelter } from '../../lib/home';
import { card } from '../../styles/tokens';
import { Skeleton } from '../live/shared/Skeleton';
import { HomeMap } from './HomeMap';

/** Nearest open refuge: name, how far, space left, map. "Report flooding here" last. */
export function RefugeCard() {
  const { shelters, sheltersReady } = useApp();
  if (!sheltersReady) return <Skeleton className="h-72 w-full rounded-card" />;
  const s = nearestOpenShelter(shelters);
  const used = s ? percentOf(s.currentCapacity, s.maxCapacity) : null;
  return (
    <section aria-labelledby="refuge-title" className={`${card} grid gap-3 p-4`}>
      <h2 id="refuge-title" className="flex items-center gap-2 text-base font-semibold">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" /> {s && s.status !== 'OPEN' ? 'Nearest refuge (not open)' : 'Nearest open refuge'}
      </h2>
      {s ? (
        <div className="grid gap-1">
          <p className="text-lg font-semibold">{textOr(s.name)}</p>
          <p className="text-sm text-muted">
            {formatKm(s.distanceKm)} away, about {formatMin(s.travelTimeMin)} by car (estimate)
            {used !== null && <> · {Math.max(0, s.maxCapacity - s.currentCapacity)} places left</>}
          </p>
          {used !== null && (
            <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="img" aria-label={`${used}% full`}>
              <i className="block h-full bg-action" style={{ width: `${used}%` }} />
            </div>
          )}
          <p className="text-xs text-muted">Places left are demo numbers, not an official register.</p>
        </div>
      ) : (
        <p className="text-sm text-muted">The refuge list could not be loaded. Open the map to see the demo list.</p>
      )}
      <HomeMap />
      <Link to="/reports?new=1" className="flex min-h-12 items-center justify-center gap-2 rounded-btn bg-raised font-medium">
        <MessageSquareWarning className="h-5 w-5" aria-hidden="true" /> Report flooding here
      </Link>
    </section>
  );
}

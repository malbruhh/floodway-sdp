import React from 'react';
import { BarChart3 } from 'lucide-react';
import { districtRisk } from '../../lib/home';
import { LEVEL_META, LEVEL_PALETTE } from '../../lib/vision/levels';
import type { Camera } from '../../types/vision';
import { EmptyState } from '../live/shared/EmptyState';
import { Skeleton } from '../live/shared/Skeleton';
import { card, cardPad, cardTitle, num } from '../../styles/tokens';

interface Props {
  loading: boolean;
  cameras: Camera[];
}

/** Ranked bars: level word plus a bar for water as a share up the bank. Colour is never the only signal. */
export function DistrictRiskBars({ loading, cameras }: Props) {
  const rows = districtRisk(cameras);
  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="district-title">
      <h2 id="district-title" className={`${cardTitle} flex items-center gap-2`}>
        <BarChart3 className="h-5 w-5 text-slate-600" aria-hidden="true" /> Risk by area
      </h2>
      <p className="mt-0.5 text-xs/4 text-slate-700">Sample cameras, grouped by nearest named place. Highest first.</p>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="No areas to rank" hint="Areas appear once cameras report." />
        ) : (
          <ol className="space-y-3">
            {rows.map((r) => {
              const meta = LEVEL_META[r.level];
              const Icon = meta.icon;
              const width = Math.max(4, Math.min(100, Math.round(r.ratio * 100)));
              return (
                <li key={r.district}>
                  <div className="flex items-center justify-between gap-2 text-sm/5">
                    <span className="min-w-0 truncate font-semibold text-slate-900">{r.district}</span>
                    <span className={`flex shrink-0 items-center gap-1 font-semibold ${meta.text}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" /> {meta.label}
                      <span className={`${num} font-normal text-slate-700`}>{Math.round(r.ratio * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(r.ratio * 100))} aria-label={`${r.district}: ${meta.label}, water at ${Math.round(r.ratio * 100)}% up the bank`}>
                    <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: LEVEL_PALETTE[r.level].marker }} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

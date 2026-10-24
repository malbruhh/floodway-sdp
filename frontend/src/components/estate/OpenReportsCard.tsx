import React from 'react';
import { Link } from 'react-router-dom';
import { reportStatusInfo } from '../../lib/reportStatus';
import { card, cardPad, cardTitle, interactive, num, pill } from '../../styles/tokens';
import type { CitizenReport } from '../../types';

/** Citizen reports inside the township that still wait for review. */
export function OpenReportsCard({ open, published }: { open: CitizenReport[]; published: number }) {
  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="open-reports-title">
      <h2 id="open-reports-title" className={cardTitle}>Open reports</h2>
      <p className="mt-1 text-sm/5 text-muted">
        {open.length} waiting for review · {published} published
      </p>
      {open.length === 0 ? (
        <p className="mt-2 text-sm/5 text-muted">No open reports in this township.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {open.slice(0, 5).map((r) => (
            <li key={r.id} className="py-2">
              <p className="text-sm/5 font-medium text-ink">{r.title}</p>
              <p className="flex flex-wrap items-center gap-2 text-xs/4 text-muted">
                <span>{r.location}</span>
                <span className={num}>{Number.isFinite(r.waterDepthCm) ? `${r.waterDepthCm} cm` : 'depth unknown'}</span>
                <span className={pill}>{reportStatusInfo(r.status).pill}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs/4 text-muted">Reports are citizen submissions. None is officially verified.</p>
      <Link to="/reports" className={`mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-link underline ${interactive}`}>
        Open the review desk
      </Link>
    </section>
  );
}

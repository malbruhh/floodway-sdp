import React from 'react';
import { CheckCircle2, Clock, MapPin, ShieldCheck, ThumbsUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatCm } from '../../lib/format';
import { REPORT_GROUPS, reportGroup, reportStatusInfo } from '../../lib/reportStatus';
import type { CitizenReport } from '../../types';

export type ReportFilter = 'all' | 'published' | 'deep';

interface Props {
  filter: ReportFilter;
  viewMode?: 'public' | 'review';
  onReport: () => void;
}

const PILL: Record<string, string> = {
  reviewed: 'bg-normal-bg text-normal',
  ai: 'bg-advisory-bg text-advisory',
  seed: 'bg-raised text-muted',
  unverified: 'bg-warning-bg text-warning',
};

function ReportCard({ report, review }: { report: CitizenReport; review: boolean }) {
  const { upvoteReport, approveReport, rejectReport } = useApp();
  const info = reportStatusInfo(report.status);
  const Icon = info.kind === 'reviewed' ? CheckCircle2 : info.kind === 'ai' ? ShieldCheck : Clock;
  const deep = report.waterDepthCm >= 35;
  return (
    <article className="grid gap-2.5 rounded-card border border-line bg-surface p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${PILL[info.kind] ?? PILL.unverified}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {info.tile}
        </span>
        <span className="text-xs text-muted">{report.author} · {report.timestampStr}</span>
      </div>
      <h3 className="text-base font-semibold leading-snug">{report.title}</h3>
      {report.imageUrl && <img src={report.imageUrl} alt="" loading="lazy" className="aspect-video w-full rounded-media object-cover" />}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" /> {report.location.split(',')[0].trim()}</span>
        <span><b className="text-ink">{formatCm(report.waterDepthCm)}</b> deep · {deep ? 'road likely under water' : 'take care'}</span>
      </p>
      {review && !report.humanVerification ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={() => approveReport(report.id, 'Demo reviewer', 'Demo reviewer')} className="min-h-11 rounded-btn bg-action px-3 text-sm font-medium text-white">Approve (demo)</button>
          <button type="button" onClick={() => rejectReport(report.id, 'Insufficient water depth evidence')} className="min-h-11 rounded-btn bg-raised px-4 text-sm font-medium">Reject</button>
        </div>
      ) : (
        <button type="button" onClick={() => upvoteReport(report.id)} className="flex min-h-11 items-center gap-2 justify-self-start rounded-btn bg-raised px-3 text-sm font-medium">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" /> I see it too ({report.upvotes})
        </button>
      )}
    </article>
  );
}

/** Reports on a time rail: Last 30 minutes, Last hour, Earlier today. */
export function ReportFeed({ filter, viewMode = 'public', onReport }: Props) {
  const { reports } = useApp();
  const review = viewMode === 'review';
  const shown = reports.filter((r) => {
    const info = reportStatusInfo(r.status);
    if (review) return info.awaitingReview;
    if (r.status === 'REJECTED') return false;
    if (filter === 'published') return info.published;
    if (filter === 'deep') return r.waterDepthCm >= 30;
    return true;
  });

  if (shown.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded-card border border-dashed border-control bg-surface p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-normal" aria-hidden="true" />
        <p className="text-base font-semibold">{review ? 'Nothing waiting for review' : 'No reports here yet'}</p>
        <p className="max-w-[36ch] text-sm text-muted">{review ? 'Every report has been looked at.' : 'If you see flooding, tell others. It takes a minute.'}</p>
        {!review && <button type="button" onClick={onReport} className="min-h-12 rounded-btn bg-action px-5 font-medium text-white">Report flooding</button>}
      </div>
    );
  }

  return (
    <div className="grid">
      {REPORT_GROUPS.map((g) => {
        const items = shown.filter((r) => reportGroup(r.timestampStr) === g);
        if (items.length === 0) return null;
        return (
          <section key={g} aria-label={g} className="relative grid gap-2 pb-[18px] pl-7 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[7px] [&:not(:last-child)]:before:top-5 [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-control">
            <span className="absolute left-0 top-[3px] h-4 w-4 rounded-full bg-ground shadow-[inset_0_0_0_3px_var(--color-ink)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">{g}</h2>
            <div className="grid gap-3 lg:grid-cols-2">{items.map((r) => <ReportCard key={r.id} report={r} review={review} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

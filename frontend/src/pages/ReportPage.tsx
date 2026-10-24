import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ReportFeed, type ReportFilter } from '../components/reports/ReportFeed';
import { ReportModal } from '../components/reports/ReportModal';
import { Segmented } from '../components/live/shared/Segmented';
import { useApp } from '../contexts/AppContext';
import { countReports } from '../lib/reportStatus';

/** What people have reported near them. The form opens in a sheet; "Report flooding" is always one tap away. */
export function ReportPage() {
  const { reports } = useApp();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [view, setView] = useState<'public' | 'review'>('public');
  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  const counts = countReports(reports);
  const deep = reports.filter((r) => r.status !== 'REJECTED' && r.waterDepthCm >= 30).length;

  const closeForm = () => {
    setFormOpen(false);
    if (params.has('new')) { params.delete('new'); setParams(params, { replace: true }); }
  };

  return (
    <AppShell>
      <main className="mx-auto grid w-full max-w-3xl content-start gap-3 p-4 pb-8" aria-label="Reports">
        <div>
          <h1 className="text-[28px]/9 font-bold tracking-tight">Reports</h1>
          <p className="text-[15px] text-muted">What people near you have seen. Reports are not checked by any agency unless marked.</p>
        </div>

        <button type="button" onClick={() => setFormOpen(true)} className="flex min-h-14 items-center justify-center gap-2 rounded-btn bg-action text-[17px] font-medium text-white">
          <MessageSquareWarning className="h-5 w-5" aria-hidden="true" /> Report flooding here
        </button>

        <dl className="grid grid-cols-3 gap-2 text-center">
          {[['Reports', counts.total], ['Not verified', counts.awaitingReview], ['Deep water', deep]].map(([k, v]) => (
            <div key={k as string} className="rounded-card border border-line bg-surface p-2.5">
              <dd className="text-2xl font-bold">{v}</dd>
              <dt className="text-xs text-muted">{k}</dt>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted">Two starter reports and their photos are examples, not real incidents. “Deep water” means 30 cm or more.</p>

        <Segmented
          label="Which reports"
          value={view}
          onChange={(v) => setView(v as 'public' | 'review')}
          options={[
            { id: 'public', label: 'Reports' },
            { id: 'review', label: `Review desk (demo) ${counts.awaitingReview}` },
          ]}
        />
        {view === 'public' ? (
          <Segmented
            label="Filter"
            value={filter}
            onChange={(v) => setFilter(v as ReportFilter)}
            options={[
              { id: 'all', label: `All ${counts.total}` },
              { id: 'published', label: `Published ${counts.published}` },
              { id: 'deep', label: `Deep water ${deep}` },
            ]}
          />
        ) : (
          <p className="rounded-ctl bg-warning-bg p-3 text-sm text-warning">The review desk shows how a check could work. No agency uses it. Reports stay not verified until you press Approve or Reject, and Approve only moves a report to the published list in this demo.</p>
        )}

        <ReportFeed filter={filter} viewMode={view} onReport={() => setFormOpen(true)} />
      </main>
      <ReportModal isOpen={formOpen} onClose={closeForm} />
    </AppShell>
  );
}

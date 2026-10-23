import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Video,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldAlert,
  Cpu,
  Layers,
  Award,
  Sparkles
} from 'lucide-react';
import { FloodWayLogo } from '../components/brand/FloodWayLogo';
import { AppShell } from '../components/layout/AppShell';
import { countReports } from '../lib/reportStatus';
import { ReportFeed } from '../components/reports/ReportFeed';
import { ReportModal } from '../components/reports/ReportModal';
import { LiveCCTVModal } from '../components/reports/LiveCCTVModal';
import { useApp } from '../contexts/AppContext';

export function ReportPage() {
  const navigate = useNavigate();
  const { reports } = useApp();
  const [filter, setFilter] = useState<'all' | 'nearby' | 'verified' | 'active'>('all');
  const [viewMode, setViewMode] = useState<'public' | 'authority'>('public');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCctvModalOpen, setIsCctvModalOpen] = useState(false);

  const counts = countReports(reports);
  const officialCount = counts.published;
  const pendingCount = counts.awaitingReview;
  const activeCount = reports.filter((r) => r.waterDepthCm >= 30).length;

  return (
    <AppShell>

        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <FloodWayLogo className="h-12 w-14" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
                    Flood Hazard Incident Reports & Evidence
                  </h1>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Demo reports
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Citizen flood reports with a photo and a depth. Reports are unverified unless marked otherwise; nothing here is checked by an agency.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCctvModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Video className="w-4 h-4 text-[#1677FF]" />
                <span>Sample cameras</span>
              </button>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-500/25 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>🚨 Report Flood with Photo Evidence</span>
              </button>
            </div>
          </div>

          {/* Statistics Counter Bar (4 metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="font-heading font-extrabold text-2xl text-slate-900 block">{counts.total}</span>
              <span className="text-xs font-semibold text-slate-600 uppercase">Total reports</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
              <span className="font-heading font-extrabold text-2xl text-[#1677FF] block">
                {counts.aiAssessed}
              </span>
              <span className="text-xs font-semibold text-blue-900 uppercase">AI assessed</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <span className="font-heading font-extrabold text-2xl text-amber-700 block">{pendingCount}</span>
              <span className="text-xs font-semibold text-amber-900 uppercase">Awaiting review</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="font-heading font-extrabold text-2xl text-emerald-700 block">{officialCount}</span>
              <span className="text-xs font-semibold text-emerald-900 uppercase">Published (demo)</span>
            </div>
          </div>

          <p role="note" className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
            <b>Demo data.</b> The two starter reports and their photos are examples. They are not real incidents at the places named, and nothing on this page is verified by any agency.
          </p>

          {/* TWO-LAYER DESK SWITCHER BAR (Public Feed vs Authority Review Desk) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('public')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'public'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Published reports ({officialCount})</span>
              </button>

              <button
                onClick={() => setViewMode('authority')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'authority'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Review desk, demo ({pendingCount})</span>
              </button>
            </div>

            {/* Filter Chips for Public View */}
            {viewMode === 'public' && (
              <div className="flex items-center gap-1 text-xs font-bold">
                {[
                  { id: 'all', label: `All (${reports.length})` },
                  { id: 'verified', label: `Published only (${officialCount})` },
                  { id: 'active', label: `Flash Hazards (${activeCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={`py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                      filter === tab.id
                        ? 'bg-[#1677FF] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Authority Desk Explanation Notice */}
          {viewMode === 'authority' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Review desk (demo screen)</span>
                <span>
                  This is a demo of how a review step could work. No agency uses it. Reports here are <b>unverified</b> until you press <b>Approve</b> or <b>Reject</b>; Approve only moves a report to the published list in this demo.
                </span>
              </div>
            </div>
          )}

          {/* Incident Reports Feed */}
          <ReportFeed filter={filter} viewMode={viewMode} />
        </main>

        <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
        <LiveCCTVModal isOpen={isCctvModalOpen} onClose={() => setIsCctvModalOpen(false)} />
        </AppShell>
  );
}

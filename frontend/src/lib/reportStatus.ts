// One place that decides what a report's status means and how it is worded, so a card, a stat and a filter can never
// disagree. HONESTY: nothing here is an official verification. The "review desk" is a demo screen, and a "published"
// report only means someone pressed Approve in that demo (or that it came from the demo seed data).
import type { CitizenReport } from '../types';

export type ReportKind = 'reviewed' | 'seed' | 'ai' | 'unverified' | 'rejected';

export interface ReportStatusInfo {
  kind: ReportKind;
  /** Short pill text. */
  pill: string;
  /** Wording for the "Verification" tile. */
  tile: string;
  /** Appears in the public feed. */
  published: boolean;
  /** Waits in the review desk. */
  awaitingReview: boolean;
}

export function reportStatusInfo(status: CitizenReport['status']): ReportStatusInfo {
  switch (status) {
    case 'OFFICIAL_VERIFIED':
      return { kind: 'reviewed', pill: 'REVIEWED (DEMO DESK)', tile: 'Reviewed in demo', published: true, awaitingReview: false };
    case 'VERIFIED':
      return { kind: 'seed', pill: 'DEMO DATA', tile: 'Demo data', published: true, awaitingReview: false };
    case 'AI_VERIFIED':
      return { kind: 'ai', pill: 'AI ASSESSED', tile: 'AI assessed', published: false, awaitingReview: true };
    case 'REJECTED':
      return { kind: 'rejected', pill: 'REJECTED', tile: 'Rejected', published: false, awaitingReview: false };
    default:
      return { kind: 'unverified', pill: 'UNVERIFIED', tile: 'Unverified', published: false, awaitingReview: true };
  }
}

export interface ReportCounts {
  total: number;
  published: number;
  awaitingReview: number;
  /** Reports whose photo an AI check actually assessed. */
  aiAssessed: number;
}

export function countReports(reports: CitizenReport[]): ReportCounts {
  const visible = reports.filter((r) => r.status !== 'REJECTED');
  return {
    total: visible.length,
    published: visible.filter((r) => reportStatusInfo(r.status).published).length,
    awaitingReview: visible.filter((r) => reportStatusInfo(r.status).awaitingReview).length,
    aiAssessed: visible.filter((r) => r.status === 'AI_VERIFIED' || r.aiVerification?.ran === true).length,
  };
}

/** Minutes since a report, read from its "12 min ago" / "Just now" text. Unreadable text counts as old. */
export function reportAgeMin(timestampStr: string): number {
  const t = timestampStr.trim().toLowerCase();
  if (t === 'just now') return 0;
  const m = t.match(/^(\d+)\s*(min|minute|minutes|h|hr|hour|hours)\b/);
  if (!m) return Number.POSITIVE_INFINITY;
  return m[2].startsWith('m') ? Number(m[1]) : Number(m[1]) * 60;
}

export const REPORT_GROUPS = ['Last 30 minutes', 'Last hour', 'Earlier today'] as const;
export type ReportGroup = (typeof REPORT_GROUPS)[number];

export function reportGroup(timestampStr: string): ReportGroup {
  const a = reportAgeMin(timestampStr);
  return a <= 30 ? 'Last 30 minutes' : a <= 60 ? 'Last hour' : 'Earlier today';
}

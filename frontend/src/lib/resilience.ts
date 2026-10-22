import type { Episode, ResilienceSummary } from '../types/resilience';

/**
 * Loss-avoided estimate. The inputs are assumptions the viewer can edit, not measured facts. The defaults are
 * placeholders to be replaced with sourced figures: nothing here is a statistic about any real township.
 */
export interface Assumptions {
  minLeadMin: number;
  householdsPerZone: number;
  responseRatePct: number;
  movableValueRm: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = { minLeadMin: 15, householdsPerZone: 200, responseRatePct: 30, movableValueRm: 3000 };

export const ASSUMPTION_LIMITS: Record<keyof Assumptions, [number, number]> = {
  minLeadMin: [0, 240],
  householdsPerZone: [0, 100_000],
  responseRatePct: [0, 100],
  movableValueRm: [0, 1_000_000],
};

export const ASSUMPTION_LABELS: Record<keyof Assumptions, string> = {
  minLeadMin: 'Minimum lead time (min)',
  householdsPerZone: 'Households per alert zone',
  responseRatePct: 'Households that act on the warning (%)',
  movableValueRm: 'Movable value saved per acting household (RM)',
};

export function clampAssumption(key: keyof Assumptions, value: unknown): number {
  const [lo, hi] = ASSUMPTION_LIMITS[key];
  const n = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_ASSUMPTIONS[key];
  return Math.min(hi, Math.max(lo, n));
}

/** Anything unreadable (corrupt storage, an old shape, a bad field) falls back to the default for that field only. */
export function sanitizeAssumptions(raw: unknown): Assumptions {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_ASSUMPTIONS };
  (Object.keys(out) as (keyof Assumptions)[]).forEach((k) => { out[k] = clampAssumption(k, src[k]); });
  return out;
}

const STORAGE_KEY = 'floodway_resilience_assumptions';

export function loadAssumptions(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Assumptions {
  try {
    return sanitizeAssumptions(JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_ASSUMPTIONS };
  }
}

export function saveAssumptions(a: Assumptions, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch { /* storage can be blocked; the page works without it */ }
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export interface LossResult {
  qualifying: number;
  total: number;
  rm: number;
}

/** Only episodes with a lead time of at least `minLeadMin` count: nobody moves belongings without time to do it. */
export function estimateLossAvoided(episodes: Pick<Episode, 'lead_time_s'>[], a: Assumptions): LossResult {
  const need = a.minLeadMin * 60;
  const qualifying = episodes.filter((e) => e.lead_time_s !== null && e.lead_time_s >= need).length;
  const rm = Math.round(qualifying * a.householdsPerZone * (a.responseRatePct / 100) * a.movableValueRm);
  return { qualifying, total: episodes.length, rm };
}

export const fmtRm = (n: number): string => `RM ${n.toLocaleString('en-MY')}`;

/** The method, in words with the numbers filled in. Every assumption label appears so no figure stands without its basis. */
export function formulaText(a: Assumptions, r: LossResult): string {
  return `${r.qualifying} episode(s) with lead time of at least ${a.minLeadMin} min × ${a.householdsPerZone} households per zone × ` +
    `${a.responseRatePct}% acting × ${fmtRm(a.movableValueRm)} per household = ${fmtRm(r.rm)}`;
}

export function formatLead(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return 'n/a';
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export type ResilienceView =
  | { status: 'error' }
  | {
      status: 'ready';
      allSimulated: boolean;
      empty: boolean;
      episodes: number;
      ongoing: number;
      medianLead: string;
      leadNote: string;
      alertsRaised: number;
      alertsSentExternal: number;
      alertNote: string | null;
      householdsRouted: number;
      arrived: number;
      loss: LossResult;
    };

/** Everything the page shows, as plain data. A null summary (backend unreachable) carries no numbers at all. */
export function buildResilienceView(summary: ResilienceSummary | null, a: Assumptions): ResilienceView {
  if (!summary) return { status: 'error' };
  const { lead, alerts, routes } = summary;
  const noExternal = alerts.raised + alerts.all_clear > 0 && alerts.sent_external === 0;
  return {
    status: 'ready',
    allSimulated: summary.all_simulated,
    empty: summary.episodes_caught === 0 && alerts.raised === 0 && routes.started === 0,
    episodes: summary.episodes_caught,
    ongoing: summary.episodes_ongoing,
    medianLead: formatLead(lead.median_s),
    leadNote: `${lead.count} of ${summary.episodes_caught} episode(s) had a measurable lead time` +
      (lead.none_count ? `; ${lead.none_count} did not reach DANGER or jumped straight to it.` : '.'),
    alertsRaised: alerts.raised,
    alertsSentExternal: alerts.sent_external,
    alertNote: noExternal
      ? 'No alert reached an external channel (Telegram is not configured, failed, or was suppressed). Alerts were shown in the app only.'
      : null,
    householdsRouted: routes.started,
    arrived: routes.arrived,
    loss: estimateLossAvoided(summary.episodes, a),
  };
}

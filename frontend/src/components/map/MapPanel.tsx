import { AlertTriangle, Bike, Car, CheckCircle2, Footprints, MapPin, Navigation, Route, Waves } from 'lucide-react';
import type { Shelter } from '../../types';
import type { TravelMode } from '../../lib/mappers';
import { ORIGINS } from '../../data/klDemo';
import { formatCapacity, formatMin, percentOf } from '../../lib/format';
import { etaMin, type ScoredRoute } from '../../lib/routing';
import type { Scenario } from './FloodProneLayer';

export type ShelterFilter = 'all' | 'open' | 'recommended';

export const SCENARIO_INFO: Record<Scenario, { label: string; sub: string; active: string }> = {
  normal: { label: 'Normal', sub: 'Dry', active: 'bg-normal text-white' },
  warning: { label: 'Warning', sub: 'Rising', active: 'bg-warning text-white' },
  danger: { label: 'Danger', sub: 'Peak', active: 'bg-danger text-white' },
};

const fmtKm = (m: number) => `${(m / 1000).toFixed(1)} km`;

interface Props {
  originId: string;
  onOrigin: (id: string) => void;
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  auto: boolean;
  onAuto: () => void;
  autoNote: string;
  floodedCount: number;
  cameraZoneCount: number;
  shelters: Shelter[];
  best: Record<string, ScoredRoute | null>;
  selectedId: string;
  onSelect: (id: string) => void;
  filter: ShelterFilter;
  onFilter: (f: ShelterFilter) => void;
  mode: TravelMode;
  onMode: (m: TravelMode) => void;
  alternatives: ScoredRoute[];
  chosen: number;
  onChoose: (i: number) => void;
  navigating: boolean;
  onStart: () => void;
  routesReady: boolean;
}

const MODES: { id: TravelMode; label: string; Icon: typeof Car }[] = [
  { id: 'car', label: 'Drive', Icon: Car },
  { id: 'bike', label: 'Motorcycle', Icon: Bike },
  { id: 'walk', label: 'Walk', Icon: Footprints },
];

/** Controls and relief-centre list. Rendered in the desktop side panel and inside the phone bottom sheet. */
export function MapPanel(p: Props) {
  const shown = p.shelters.filter((s) => (p.filter === 'open' ? s.status === 'OPEN' : p.filter === 'recommended' ? s.status === 'OPEN' && s.routeStatus === 'CLEAR' : true));
  const selected = p.shelters.find((s) => s.id === p.selectedId);

  return (
    <div className="space-y-4 p-4">
      {/* Where "you" are: fixed demo positions, all in Kuala Lumpur */}
      <section aria-labelledby="origin-label">
        <label id="origin-label" htmlFor="origin-select" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Your position (demo)
        </label>
        <select
          id="origin-select"
          value={p.originId}
          onChange={(e) => p.onOrigin(e.target.value)}
          className="min-h-11 w-full rounded-ctl border border-control bg-surface px-3 text-base font-medium text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-link"
        >
          {ORIGINS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}, Kuala Lumpur
            </option>
          ))}
        </select>
      </section>

      {/* Scenario */}
      <details className="rounded-ctl bg-raised px-3" open={!p.auto}>
        <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-medium"><Waves className="h-4 w-4" aria-hidden="true" /> Demo: river level, {p.auto ? 'following cameras' : 'set by you'}</summary>
        <div className="pb-3">
        <p id="scenario-label" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          <Waves className="h-3.5 w-3.5" aria-hidden="true" /> Set the river level yourself
        </p>
        <div role="group" aria-labelledby="scenario-label" className="grid grid-cols-3 gap-1.5 rounded-ctl border border-line bg-raised p-1.5">
          {(Object.keys(SCENARIO_INFO) as Scenario[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={!p.auto && p.scenario === k}
              onClick={() => p.onScenario(k)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-link ${
                !p.auto && p.scenario === k ? `${SCENARIO_INFO[k].active} shadow-md` : 'text-muted hover:bg-surface'
              }`}
            >
              <span>{SCENARIO_INFO[k].label}</span>
              <span className="font-medium opacity-90">{SCENARIO_INFO[k].sub}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={p.auto}
          onClick={p.onAuto}
          className={`mt-1.5 min-h-11 w-full rounded-lg border text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-link ${
            p.auto ? 'border-action bg-action text-white' : 'border-line text-muted hover:bg-surface'
          }`}
        >
          Follow cameras (auto): {SCENARIO_INFO[p.scenario].label}
        </button>
        {p.auto && <p className="mt-1.5 text-xs text-muted">{p.autoNote}.</p>}
        <p className="mt-1.5 text-xs text-muted">
          {p.floodedCount} of 16 flood-prone areas flooded
          {p.cameraZoneCount > 0 ? `, plus ${p.cameraZoneCount} sample-camera ${p.cameraZoneCount === 1 ? 'zone' : 'zones'}` : ''}. Demo data, not an official flood map.
        </p>
      </div>
      </details>

      {/* Route alternatives for the selected relief centre */}
      <section aria-labelledby="routes-label">
        <p id="routes-label" className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          <Route className="h-3.5 w-3.5" aria-hidden="true" /> Routes to {selected ? selected.name.replace('Demo relief centre: ', '') : 'a relief centre'}
        </p>
        {!p.routesReady ? (
          <p className="text-xs text-muted">Loading road routes…</p>
        ) : p.alternatives.length === 0 ? (
          <p className="rounded-ctl border border-transparent bg-warning-bg p-2.5 text-xs text-warning">No stored road route for this pair.</p>
        ) : (
          <ul className="space-y-1.5">
            {p.alternatives.map((r, i) => (
              <li key={r.index}>
                <button
                  type="button"
                  aria-pressed={p.chosen === i}
                  onClick={() => p.onChoose(i)}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-ctl border px-3 text-left text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-link ${
                    p.chosen === i ? 'border-action bg-surface ring-1 ring-action/25' : 'border-line bg-surface hover:border-control'
                  }`}
                >
                  <span className="font-bold text-ink">
                    {i === 0 ? 'Suggested route' : `Other route ${i}`}
                  </span>
                  <span className="text-muted">
                    {fmtKm(r.distanceM)} · ~{formatMin(etaMin(r, p.mode))}
                  </span>
                  <span className={`shrink-0 font-bold ${r.crossings === 0 ? 'text-normal' : 'text-danger'}`}>
                    {r.crossings === 0 ? 'Avoids flooded areas' : `Passes through ${r.crossings} flooded ${r.crossings === 1 ? 'area' : 'areas'}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {p.alternatives.length > 0 && p.alternatives[0].crossings > 0 && (
          <p className="mt-1.5 rounded-ctl border border-transparent bg-danger-bg p-2 text-xs font-semibold text-danger">
            Every route passes through flooded areas in this scenario. The suggested route passes through the fewest.
          </p>
        )}
        <p className="mt-1.5 text-xs text-muted">Roads from OpenStreetMap. Time has no live traffic{p.mode !== 'car' ? ' and uses a typical speed for this mode' : ''}.</p>
        <div role="group" aria-label="Travel mode" className="mt-2 grid grid-cols-3 gap-1 rounded-ctl border border-line bg-surface p-1">
          {MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={p.mode === id}
              onClick={() => p.onMode(id)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-link ${
                p.mode === id ? 'bg-action text-white' : 'text-muted hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Relief centres */}
      <section aria-labelledby="centres-label">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 id="centres-label" className="text-sm font-bold text-ink">
            Relief centres <span className="font-medium text-muted">(demo list, {shown.length} shown)</span>
          </h2>
        </div>
        <div role="group" aria-label="Filter relief centres" className="mb-2 grid grid-cols-3 gap-1 rounded-ctl bg-raised p-1">
          {(['all', 'open', 'recommended'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={p.filter === f}
              onClick={() => p.onFilter(f)}
              className={`min-h-11 rounded-lg text-xs font-bold capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-link ${
                p.filter === f ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
            >
              {f === 'open' ? 'Open only' : f}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {shown.map((s) => {
            const sel = s.id === p.selectedId;
            const b = p.best[s.id];
            const pct = percentOf(s.currentCapacity, s.maxCapacity);
            const unavailable = s.status === 'FULL' || s.status === 'CLOSED';
            return (
              <li key={s.id}>
                <div className={`rounded-card border p-3 ${sel ? 'border-action bg-surface ring-1 ring-action/25' : 'border-line bg-surface'}`}>
                  <button
                    type="button"
                    aria-pressed={sel}
                    onClick={() => p.onSelect(s.id)}
                    className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-link"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-xs font-bold uppercase tracking-wide text-muted">{s.category}</span>
                        <span className="block text-sm font-bold text-ink">{s.name}</span>
                      </div>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                          s.status === 'CLOSED' ? 'bg-danger-bg text-danger' : s.status === 'FULL' ? 'bg-warning-bg text-warning' : 'bg-normal-bg text-normal'
                        }`}
                      >
                        {unavailable ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                        {s.status === 'FULL' ? 'FULL' : s.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                      {b ? (
                        <>
                          <span className="font-bold text-ink">{fmtKm(b.distanceM)}</span>
                          <span className="font-semibold text-link">~{formatMin(etaMin(b, p.mode))}</span>
                          <span className={`font-semibold ${b.crossings === 0 ? 'text-normal' : 'text-danger'}`}>
                            {b.crossings === 0 ? 'Avoids flooded areas' : `Passes through ${b.crossings} flooded ${b.crossings === 1 ? 'area' : 'areas'}`}
                          </span>
                        </>
                      ) : (
                        <span>Road route unavailable</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs text-muted">
                        <span>Occupancy {pct === null ? '–' : `${pct}%`}</span>
                        <span className="font-bold text-ink">{formatCapacity(s.currentCapacity, s.maxCapacity)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                        <div className={`h-full rounded-full ${(pct ?? 0) >= 100 ? 'bg-danger' : (pct ?? 0) > 80 ? 'bg-warning-bg0' : 'bg-normal-bg0'}`} style={{ width: `${pct ?? 0}%` }} />
                      </div>
                    </div>
                    {unavailable && <p className="mt-2 text-xs font-semibold text-warning">Full. Choose another centre.</p>}
                  </button>
                  {sel && !unavailable && (
                    <button
                      type="button"
                      onClick={p.onStart}
                      disabled={p.navigating || !p.alternatives.length}
                      className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-ctl bg-action text-xs font-bold text-white  hover:bg-[#2b2b2b] focus:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <Navigation className="h-4 w-4" aria-hidden="true" /> {p.navigating ? 'Navigating…' : 'Start route'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

import React, { useMemo } from 'react';
import type { DemoOrigin } from '../../data/klDemo';
import { RISK_DISCLAIMER, buildingRisk, sanitizeBuilding, type BuildingInput } from '../../lib/estate';
import type { Scenario } from '../../lib/floodScenario';
import { LEVEL_META } from '../../lib/vision/levels';
import { card, cardPad, cardTitle, interactive, label } from '../../styles/tokens';
import type { Level } from '../../types/vision';

interface Props {
  origins: DemoOrigin[];
  building: BuildingInput;
  onChange: (b: BuildingInput) => void;
  scenario: Scenario;
  areaLevel: Level | null;
}

const field = `mt-1 min-h-11 w-full rounded-ctl border border-control bg-surface px-3 text-base text-ink ${interactive}`;

/** Rule-based building and basement risk for a named place in the township. */
export function BuildingRiskPanel({ origins, building, onChange, scenario, areaLevel }: Props) {
  const origin = origins.find((o) => o.id === building.placeId) ?? origins[0];
  const risk = useMemo(() => (origin ? buildingRisk(building, origin, scenario) : null), [building, origin, scenario]);
  const set = (patch: Partial<BuildingInput>) => onChange(sanitizeBuilding({ ...building, ...patch }));

  if (!origin || !risk) {
    return (
      <section className={`${card} ${cardPad}`} aria-labelledby="risk-title">
        <h2 id="risk-title" className={cardTitle}>Building and basement risk</h2>
        <p className="mt-2 text-sm/5 text-muted">No named places in this township.</p>
      </section>
    );
  }
  const meta = LEVEL_META[risk.level];
  const Icon = meta.icon;
  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="risk-title">
      <h2 id="risk-title" className={cardTitle}>Building and basement risk</h2>
      <div className="mt-3 grid gap-3 @min-[560px]/main:grid-cols-2">
        <label className={label}>
          Place
          <select className={field} value={origin.id} onChange={(e) => set({ placeId: e.target.value })}>
            {origins.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className={label}>
          Basement levels
          <input className={field} type="number" min={0} max={5} step={1} value={building.basementLevels} onChange={(e) => set({ basementLevels: Number(e.target.value) })} />
        </label>
        <label className={label}>
          Ground floor above road (cm)
          <input className={field} type="number" min={0} max={200} step={10} value={building.groundFloorCm} onChange={(e) => set({ groundFloorCm: Number(e.target.value) })} />
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm/5 text-ink">
          <input type="checkbox" className="h-5 w-5" checked={building.criticalEquipment} onChange={(e) => set({ criticalEquipment: e.target.checked })} />
          Critical equipment (pumps, switchgear, servers) is in the basement
        </label>
      </div>

      <div className="mt-4" aria-live="polite">
        <span className={`inline-flex min-h-11 items-center gap-2 rounded-ctl border px-4 text-base font-bold ${meta.chip}`}>
          <Icon className="h-5 w-5" aria-hidden="true" /> Risk: {meta.label}
        </span>
        {areaLevel === null && <p className="mt-2 text-sm/5 text-muted">No camera is reporting here, so this assumes normal water.</p>}
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm/5 text-ink">
          {risk.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <h3 className="mt-3 text-sm/5 font-semibold text-ink">What to do</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm/5 text-ink">
          {risk.actions.map((a) => <li key={a}>{a}</li>)}
        </ol>
        <p className="mt-3 text-xs/4 text-muted">{RISK_DISCLAIMER}</p>
      </div>
    </section>
  );
}

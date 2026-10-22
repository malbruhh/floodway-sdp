import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  ASSUMPTION_LABELS, ASSUMPTION_LIMITS, DEFAULT_ASSUMPTIONS, clampAssumption, fmtRm, formulaText,
  type Assumptions, type LossResult,
} from '../../lib/resilience';
import { btnSecondary, card, cardPad, cardTitle, focusRing, num } from '../../styles/tokens';

interface Props {
  assumptions: Assumptions;
  onChange: (a: Assumptions) => void;
  loss: LossResult;
}

/** Illustrative only. The viewer can change every assumption; the defaults are placeholders, not sourced statistics. */
export function LossEstimate({ assumptions, onChange, loss }: Props) {
  const keys = Object.keys(DEFAULT_ASSUMPTIONS) as (keyof Assumptions)[];
  return (
    <section className={`${card} ${cardPad}`} aria-labelledby="loss-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="loss-title" className={cardTitle}>Loss avoided (illustrative estimate)</h2>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
          Illustrative · assumptions are placeholders
        </span>
      </div>

      <p className={`${num} mt-3 font-heading text-4xl/[44px] font-extrabold text-slate-900`} data-testid="loss-rm">{fmtRm(loss.rm)}</p>
      <p className="mt-1 text-sm/5 text-slate-700">{formulaText(assumptions, loss)}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {keys.map((k) => (
          <label key={k} className="block text-sm/5 font-medium text-slate-800">
            {ASSUMPTION_LABELS[k]}
            <input
              type="number"
              inputMode="decimal"
              min={ASSUMPTION_LIMITS[k][0]}
              max={ASSUMPTION_LIMITS[k][1]}
              value={assumptions[k]}
              onChange={(e) => onChange({ ...assumptions, [k]: clampAssumption(k, e.target.valueAsNumber) })}
              className={`${num} mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onChange({ ...DEFAULT_ASSUMPTIONS })} className={btnSecondary}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset assumptions
        </button>
        <p className="text-xs/4 text-slate-700">
          Only events with enough lead time count, because nobody can move belongings without time. Replace the placeholders with sourced
          figures before quoting this number. It is not a forecast and not a measured saving.
        </p>
      </div>
    </section>
  );
}

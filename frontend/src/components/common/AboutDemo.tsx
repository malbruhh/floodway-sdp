import React from 'react';
import { Info } from 'lucide-react';

interface Props {
  /** "dark" for the welcome page, "light" elsewhere. */
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * What is real and what is simulated, in plain words. Shown on the welcome page and on Profile so no judge or user
 * can mistake the demo for an operational system. Keep this text in step with docs/ops/DEMO_RUNBOOK.md, section 1.
 */
export function AboutDemo({ tone = 'light', className = '' }: Props) {
  const dark = tone === 'dark';
  return (
    <aside
      aria-labelledby="about-demo-title"
      className={`rounded-card border p-4 text-left text-xs/5 ${dark ? 'border-slate-700 bg-slate-900/70 text-slate-300' : 'border-line bg-surface text-muted'} ${className}`}
    >
      <h2 id="about-demo-title" className={`flex items-center gap-1.5 text-sm/5 font-bold ${dark ? 'text-white' : 'text-ink'}`}>
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" /> About this demo
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <b>Sample imagery. Not real camera footage.</b> Sample cameras use AI-generated base photos with synthetic water overlays.
          Every sample camera is labelled SAMPLE and the loop is labelled PLAYBACK.
        </li>
        <li>Sensor counts, river levels, rainfall and the forecast are simulated examples. The forecast is a simple formula, not a trained model.</li>
        <li>The Estate page groups cameras, alerts and reports by township. Its building risk is a rule-based estimate from illustrative flood areas, not an engineering assessment.</li>
        <li>Reports are examples or unverified citizen submissions. No agency or cloud service verifies, certifies or supplies any data shown.</li>
        <li>Routes are approximate straight-line detours, not road-aware navigation.</li>
        <li>Map data &copy; OpenStreetMap contributors.</li>
      </ul>
      <p className={`mt-2 font-semibold ${dark ? 'text-amber-300' : 'text-warning'}`}>
        This is a prototype. For real flood warnings follow official sources.
      </p>
    </aside>
  );
}

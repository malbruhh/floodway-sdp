import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useExit } from '../../hooks/useExit';

export interface LegendItem {
  key: string;
  swatch: React.ReactNode;
  label: string;
  /** Where the data comes from. Every layer must say, so the map never claims more than the data supports. */
  source: string;
}

/** A 24px line/shape sample for the legend. */
const Line = ({ color, dashed = false }: { color: string; dashed?: boolean }) => (
  <svg width="24" height="10" viewBox="0 0 24 10" aria-hidden="true">
    <line x1="1" y1="5" x2="23" y2="5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={dashed ? '5 4' : undefined} />
  </svg>
);
const Dot = ({ color, dashed = false }: { color: string; dashed?: boolean }) => (
  <svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true">
    <circle cx="12" cy="7" r="5.5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.8" strokeDasharray={dashed ? '3 2' : undefined} />
  </svg>
);

interface Props {
  /** Colour of the flooded areas for the selected scenario. */
  floodColor: string;
  /** Sits above the bottom sheet on phones: its bottom offset in px. */
  bottomOffset?: number;
}

/** Collapsed to a small button by default on every screen size, so it never hides the map. Opens a compact one-line-per-layer panel. */
export function MapLegend({ floodColor, bottomOffset = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const panel = useExit(open, 140);
  const items: LegendItem[] = [
    { key: 'route', swatch: <Line color="#1d5fbf" />, label: 'Road route', source: 'OpenStreetMap roads' },
    { key: 'alt', swatch: <Line color="#64748B" dashed />, label: 'Other route', source: '' },
    { key: 'flood', swatch: <Dot color={floodColor} />, label: 'Flooded area', source: '' },
    { key: 'watch', swatch: <Dot color="#0284C7" dashed />, label: 'Low-lying, on watch', source: '' },
    { key: 'cam', swatch: <Dot color="#DC2626" />, label: 'Camera zone (sample)', source: '' },
    { key: 'shelters', swatch: <span className="text-emerald-600 text-sm leading-none">⛨</span>, label: 'Relief centre', source: '' },
  ];

  return (
    <div className="absolute right-3 z-[500] flex flex-col items-end md:bottom-4 md:right-4" style={{ bottom: bottomOffset ? bottomOffset + 8 : undefined }}>
      {panel.mounted && (
        <div
          id="map-legend"
          className={`mb-2 w-60 origin-bottom-right ${panel.closing ? 'animate-pop-out' : 'animate-pop-in'} rounded-card bg-surface p-3 text-ink shadow-[0_8px_30px_rgba(0,0,0,.2)] ring-1 ring-line`}
        >
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-2 text-xs">
                <span className="flex w-6 shrink-0 items-center justify-center">{i.swatch}</span>
                <span className="font-semibold">{i.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-rule pt-2 text-xs leading-snug text-muted">
            Flood areas, shelters and cameras are demo data. Roads &copy; OpenStreetMap contributors.
          </p>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="map-legend"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-medium text-ink shadow-[0_2px_10px_rgba(0,0,0,.2)] ring-1 ring-line"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" /> Legend{' '}
        {open ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : <ChevronUp className="h-3 w-3" aria-hidden="true" />}
      </button>
    </div>
  );
}

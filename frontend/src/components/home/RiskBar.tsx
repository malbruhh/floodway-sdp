import React from 'react';
import { CircleHelp } from 'lucide-react';
import { useFlash } from '../../hooks/useFlash';
import { useNow } from '../../hooks/useNow';
import { causeLine, dataAge } from '../../lib/home';
import { LEVEL_META, LEVEL_PALETTE } from '../../lib/vision/levels';
import type { Camera, Level } from '../../types/vision';
import { Skeleton } from '../live/shared/Skeleton';

interface Props {
  loading: boolean;
  level: Level | null;
  camera: Camera | null;
  updatedAt: number | null;
}

/** The answer to "am I safe": one word, one sentence, how old the data is. Icon + word + colour, never colour alone. */
export function RiskBar({ loading, level, camera, updatedAt }: Props) {
  const now = useNow(1000);
  const flash = useFlash(level);
  if (loading) return <Skeleton className="h-[90px] w-full rounded-card" />;
  const meta = level ? LEVEL_META[level] : null;
  const pal = level ? LEVEL_PALETTE[level] : null;
  const Icon = meta?.icon ?? CircleHelp;
  const color = pal?.text ?? '#5c6370';
  return (
    <section
      aria-label="Flood risk now"
      className={`grid gap-1 rounded-card px-3.5 py-3 transition-colors duration-500 ${flash ? 'animate-pop-in' : ''}`}
      style={{ backgroundColor: pal?.tint ?? '#e9ecf0', boxShadow: `inset 4px 0 0 ${color}` }}
    >
      <div className="flex items-center gap-2" style={{ color }}>
        <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden="true" />
        <h1 className="text-[22px]/[1.1] font-bold tracking-tight">{meta ? meta.label : 'No data'}</h1>
        <span className="ml-auto whitespace-nowrap text-[13px] text-muted">{dataAge(updatedAt, now)}</span>
      </div>
      <p className="text-[15px]/[1.4]" role="status">{causeLine(level, camera)}</p>
    </section>
  );
}

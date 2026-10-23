import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Map as MapIcon, Navigation } from 'lucide-react';
import { primaryAction } from '../../lib/home';
import type { Level } from '../../types/vision';

interface Props {
  level: Level | null;
  /** Where "Go to refuge" leads: the route screen for the nearest open refuge. Undefined while shelters load or none exist. */
  refugeId?: string;
  className?: string;
}

/** The main action. Black when it is urgent (warning, danger); a quiet white card on calm days. Words follow primaryAction. */
export function GoButton({ level, refugeId, className = '' }: Props) {
  const a = primaryAction(level);
  const to = a.kind === 'refuge' && refugeId ? `/navigation/${refugeId}` : '/map';
  const Icon = a.kind === 'refuge' ? Navigation : MapIcon;
  const urgent = a.kind === 'refuge';
  return (
    <Link
      to={to}
      className={`grid min-h-[68px] grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-btn px-[18px] py-2.5 ${urgent ? 'bg-action text-white' : 'bg-surface text-ink ring-1 ring-line'} ${className}`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span>
        <b className="block text-lg font-medium">{a.label}</b>
        <span className={`text-sm ${urgent ? 'text-[#d6d6d6]' : 'text-muted'}`}>{a.sub}</span>
      </span>
      <ArrowRight className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}

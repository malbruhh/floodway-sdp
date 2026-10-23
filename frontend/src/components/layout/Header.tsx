import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { FloodWayLogo } from '../brand/FloodWayLogo';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { ORIGINS } from '../../data/klDemo';
import { DemoChip } from '../ui/DemoChip';

/** Top bar: the mark, the area you are watching, and the one "demo" note for the whole app. */
export function Header({ showLocation = true }: { showLocation?: boolean }) {
  const { selectedLocation, setSelectedLocation } = useApp();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const shortLocation = selectedLocation.split(',')[0].trim();

  return (
    <header className="sticky top-0 z-[500] flex h-[var(--top-h)] items-center gap-2 bg-ground px-4 shadow-[0_1px_0_var(--color-line)] md:px-6">
      <Link to="/home" aria-label="FloodWay home" className="flex h-11 w-9 shrink-0 items-center md:hidden">
        <FloodWayLogo className="h-7 w-7" />
      </Link>

      {showLocation && (
        <div className="relative min-w-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-h-11 min-w-0 items-center gap-1 text-[15px] text-muted"
          >
            <MapPin className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <b className="truncate font-medium text-ink">{shortLocation}</b>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
          {open && (
            <ul role="listbox" aria-label="Choose area" className="absolute left-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-card bg-surface p-1.5 shadow-[0_8px_30px_rgba(0,0,0,.15)] ring-1 ring-line">
              <li className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">Areas we watch</li>
              {ORIGINS.map((o) => (
                <li key={o.location}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedLocation === o.location}
                    onClick={() => { setSelectedLocation(o.location); setOpen(false); }}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-ctl px-3 text-left text-[15px] hover:bg-raised"
                  >
                    <span className={selectedLocation === o.location ? 'font-semibold' : ''}>{o.location}</span>
                    {selectedLocation === o.location && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <span className="flex-1" />
      <DemoChip />
      <Link to="/profile" aria-label={`${user?.name ?? 'Your'} profile`} className="hidden h-11 items-center gap-2 rounded-full pl-1 pr-3 hover:bg-raised md:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-action text-xs font-bold text-white">{(user?.name ?? '?').slice(0, 2).toUpperCase()}</span>
        <span className="text-sm font-medium">{user?.name}</span>
      </Link>
    </header>
  );
}

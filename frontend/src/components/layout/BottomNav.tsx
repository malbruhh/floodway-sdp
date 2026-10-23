import React from 'react';
import { NavLink } from 'react-router-dom';
import { House, Map, MessageSquareWarning, Cctv, UserRound } from 'lucide-react';

export const TABS = [
  { label: 'Home', icon: House, path: '/home' },
  { label: 'Map', icon: Map, path: '/map' },
  { label: 'Report', icon: MessageSquareWarning, path: '/reports' },
  { label: 'Cameras', icon: Cctv, path: '/live' },
  { label: 'Me', icon: UserRound, path: '/profile' },
];

/** Five thumb-reachable tabs on phones; the desktop sidebar takes over from 768px. */
export function BottomNav() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[600] grid h-[var(--nav-h)] grid-cols-5 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--color-line)] md:hidden">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => `flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${isActive ? 'font-bold text-ink' : 'text-muted'}`}
        >
          <tab.icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden="true" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FloodWayLogo } from '../brand/FloodWayLogo';
import { House, Map, MessageSquareWarning, Cctv, Building2, UserRound, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const ITEMS = [
  { label: 'Home', icon: House, path: '/home' },
  { label: 'Map', icon: Map, path: '/map' },
  { label: 'Report', icon: MessageSquareWarning, path: '/reports' },
  { label: 'Cameras', icon: Cctv, path: '/live' },
  { label: 'Estate', icon: Building2, path: '/estate' },
  { label: 'Me', icon: UserRound, path: '/profile' },
];

/** Desktop navigation. `defaultCollapsed` starts in the icon rail (dense pages on laptops); the user can still expand it. */
export function DashboardSidebar({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <aside className={`sticky top-0 z-30 hidden h-dvh shrink-0 select-none flex-col border-r border-line bg-surface md:flex ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}>
      <div className={`flex h-[var(--top-h)] items-center px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <FloodWayLogo className="h-8 w-8" />
          {!collapsed && <span className="text-lg font-bold tracking-tight">FloodWay</span>}
        </div>
        {!collapsed && (
          <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" className="flex h-11 w-11 items-center justify-center rounded-ctl text-muted hover:bg-raised hover:text-ink">
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {collapsed && (
        <div className="flex justify-center">
          <button type="button" onClick={() => setCollapsed(false)} aria-label="Expand sidebar" className="flex h-11 w-11 items-center justify-center rounded-ctl text-muted hover:bg-raised hover:text-ink">
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-btn px-3 text-sm font-medium ${isActive ? 'bg-action text-white' : 'text-muted hover:bg-raised hover:text-ink'} ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

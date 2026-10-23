import React from 'react';
import { BottomNav } from './BottomNav';
import { DashboardSidebar } from './DashboardSidebar';
import { Header } from './Header';

interface Props {
  children: React.ReactNode;
  /** Pages with their own location control (or none) can hide the shared area picker. */
  showLocation?: boolean;
  compactSidebar?: boolean;
}

/** Sidebar (desktop), top bar, page, bottom tabs (phone). Every signed-in page sits in this one frame. */
export function AppShell({ children, showLocation = true, compactSidebar = false }: Props) {
  return (
    <div className="flex min-h-dvh bg-ground">
      <DashboardSidebar defaultCollapsed={compactSidebar} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--nav-h)] md:pb-0">
        <Header showLocation={showLocation} />
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

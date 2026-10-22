import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FloodWayLogo } from '../brand/FloodWayLogo';
import {
  LayoutDashboard,
  Map,
  FileText,
  Video,
  Camera,
  BarChart3,
  Building2,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

/** `defaultCollapsed` starts in the icon rail (used by dense pages on laptop widths); the user can still expand it. */
export function DashboardSidebar({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/home' },
    { label: 'Map', icon: Map, path: '/map' },
    { label: 'Reports', icon: FileText, path: '/reports' },
    { label: 'Live Vision', icon: Video, path: '/live' },
    { label: 'JPS Cameras', icon: Camera, path: '/jps' },
    { label: 'Resilience', icon: BarChart3, path: '/resilience' },
    { label: 'Estate', icon: Building2, path: '/estate' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-[#071426] text-white border-r border-[#1E293B] transition-all duration-300 select-none z-30 shrink-0 sticky top-0 h-screen ${
        isCollapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1E293B]/70">
        <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <FloodWayLogo tile className="h-10 w-10" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                FloodWay
              </span>
              <span className="text-xs text-blue-400/90 font-medium tracking-wider uppercase">Life-Safety Intelligence</span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Collapse Sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-[#1E293B]/40">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Expand Sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-[#1677FF] text-white shadow-md shadow-[#1677FF]/20 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110`} />
            {!isCollapsed && <span>{item.label}</span>}
            {isCollapsed && (
              <div className="absolute left-[78px] px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-slate-700">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* System Status Footer */}
      {!isCollapsed && (
        <div className="p-3.5 m-3 rounded-xl bg-[#0B1E38]/80 border border-slate-800/80">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">LifeLine Active</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time flood prediction & community safety dispatch.
          </p>
        </div>
      )}
    </aside>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, FileText, Video, Camera, User } from 'lucide-react';

export function BottomNav() {
  const tabs = [
    { label: 'Home', icon: LayoutDashboard, path: '/home' },
    { label: 'Map', icon: Map, path: '/map' },
    { label: 'Reports', icon: FileText, path: '/reports' },
    { label: 'Live Vision', icon: Video, path: '/live' },
    { label: 'JPS', icon: Camera, path: '/jps' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[var(--nav-h)] pb-[env(safe-area-inset-bottom)] bg-white/80 backdrop-blur-xl border-t border-slate-200/70 px-2 flex items-center justify-around z-40">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 rounded-xl transition-all ${
              isActive
                ? 'text-[#1677FF] font-semibold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <tab.icon className="w-5 h-5 mb-0.5" />
          <span className="text-xs tracking-tight">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

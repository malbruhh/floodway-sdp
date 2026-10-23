import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function FamilySafetyBanner() {
  const { familySafetyStatus, setFamilySafetyStatus } = useApp();

  if (familySafetyStatus === 'IDLE') return null;

  return (
    <div
      className={`rounded-2xl p-4 text-xs md:text-sm font-medium flex items-center justify-between shadow-xs mb-4 ${
        familySafetyStatus === 'ARRIVED_SAFE'
          ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
          : 'bg-blue-50 border border-blue-300 text-blue-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-xl text-white ${
            familySafetyStatus === 'ARRIVED_SAFE' ? 'bg-emerald-600' : 'bg-[#1677FF]'
          }`}
        >
          {familySafetyStatus === 'ARRIVED_SAFE' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
        </div>
        <div>
          <span className="font-bold block text-sm">
            {familySafetyStatus === 'ARRIVED_SAFE'
              ? 'Family notified: you arrived safely at the shelter'
              : 'Evacuation in Progress · Family Alerted via Telegram'}
          </span>
          <span className="text-xs opacity-90">
            {familySafetyStatus === 'ARRIVED_SAFE'
              ? 'Geofence confirmed arrival at SK Seksyen 24. Automated Telegram check-in dispatched to family group.'
              : 'Live GPS location shared with registered emergency contacts.'}
          </span>
        </div>
      </div>

      <button
        onClick={() => setFamilySafetyStatus('IDLE')}
        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/80 hover:bg-white shadow-xs"
      >
        Dismiss
      </button>
    </div>
  );
}

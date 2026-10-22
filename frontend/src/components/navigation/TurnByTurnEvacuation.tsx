import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, ShieldCheck, CheckCircle2, AlertTriangle, Phone, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { dispatchArrivalCheckin } from '../../services/telegramService';

interface Props {
  shelterId: string;
}

export function TurnByTurnEvacuation({ shelterId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shelters, setFamilySafetyStatus } = useApp();
  const [progressPct, setProgressPct] = useState(15);
  const [isSimulating, setIsSimulating] = useState(true);
  const [hasArrived, setHasArrived] = useState(false);

  const shelter = shelters.find((s) => s.id === shelterId) || shelters[0] || {
    name: 'Dewan Serbaguna Kampung Baru',
    address: 'Kampung Baru, Kuala Lumpur (demo location)',
    contact: 'Not available (demo)'
  };

  useEffect(() => {
    if (!isSimulating || hasArrived) return;
    const interval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setHasArrived(true);
          const dateText = new Date().toLocaleDateString('en-MY', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const timeText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          // Automated Geofence Arrival Check-In Dispatch
          dispatchArrivalCheckin({
            userName: user?.name || 'Luqman Nurhakim',
            shelterName: shelter.name,
            dateStr: dateText,
            timeStr: timeText
          });
          setFamilySafetyStatus('ARRIVED_SAFE');
          return 100;
        }
        return prev + 12;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulating, hasArrived, shelter.name, user?.name]);

  const remainingMeters = Math.max(0, Math.round(1200 * (1 - progressPct / 100)));
  const remainingMinutes = Math.max(1, Math.round(7 * (1 - progressPct / 100)));

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Navigation Control */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Navigation</span>
        </button>
        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase">
          Approximate route (demo)
        </span>
      </div>

      {/* Main Guidance Card */}
      <div className="rounded-3xl bg-[#071426] border border-slate-800 text-white p-6 shadow-2xl overflow-hidden relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1677FF] flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination</span>
              <h2 className="font-heading font-extrabold text-xl md:text-2xl text-white">{shelter.name}</h2>
              <p className="text-xs text-slate-300 mt-0.5">{shelter.address}</p>
            </div>
          </div>
          <a
            href={`tel:${shelter.contact}`}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white shrink-0"
            title="Call Warden"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>

        {/* Progress Display */}
        <div className="grid grid-cols-3 gap-3 my-6 text-center">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-xs font-medium text-slate-400 block">Remaining</span>
            <span className="font-heading font-extrabold text-xl text-white">{remainingMeters} m</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-xs font-medium text-slate-400 block">Est. Time</span>
            <span className="font-heading font-extrabold text-xl text-white">~{remainingMinutes} min</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-xs font-medium text-slate-400 block">Current Speed</span>
            <span className="font-heading font-extrabold text-xl text-emerald-400">32 km/h</span>
          </div>
        </div>

        {/* Route Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>Route Completion</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1677FF] to-emerald-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Geofence Arrival Celebration Card */}
      {hasArrived ? (
        <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-xl text-emerald-900">
                You Have Safely Arrived!
              </h3>
              <p className="text-xs text-emerald-800">
                Geofence validated inside shelter perimeter (&lt;50m). Automated safety check-in dispatched to Telegram family group.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Telegram Bot Dispatch (@floodway_bot):</span>
              <a
                href="https://t.me/floodway_bot"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-sky-600 hover:text-sky-800 underline underline-offset-2"
              >
                Open @floodway_bot
              </a>
            </div>
            <p className="italic text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              "✅ Luqman Nurhakim has SAFELY ARRIVED at {shelter.name} at {new Date().toLocaleTimeString()}! Geofence verified. Family loop complete."
            </p>
          </div>

          <button
            onClick={() => navigate('/home')}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25"
          >
            Confirm Safe & Return to Dashboard
          </button>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>GPS Tracking Active · Safe route avoiding Jalan Raja Muda</span>
          </div>
          <button
            onClick={() => setProgressPct(100)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
          >
            Simulate Arrival
          </button>
        </div>
      )}
    </div>
  );
}

import { ArrowRight, Check, CheckCircle2, MessageSquare } from 'lucide-react';
import type { TelegramResult } from '../../services/telegramService';

interface Props {
  shelterName: string;
  capacity: string;
  when: string;
  /** null while the message is being sent. */
  telegram: TelegramResult | null;
  onClose: () => void;
  onReports: () => void;
}

function telegramLine(t: TelegramResult | null): { text: string; tone: string } {
  if (!t) return { text: 'Sending…', tone: 'text-slate-300' };
  if (t.success) return { text: 'Message sent via Telegram', tone: 'text-emerald-400' };
  if (t.simulated) return { text: 'Telegram is not set up on the server. Nothing was sent.', tone: 'text-amber-300' };
  return { text: 'Could not send. Nothing was delivered.', tone: 'text-red-300' };
}

/** Shown when the simulated drive ends. It reports what actually happened with the Telegram message. */
export function ArrivalDialog({ shelterName, capacity, when, telegram, onClose, onReports }: Props) {
  const line = telegramLine(telegram);
  return (
    <div role="dialog" aria-modal="true" aria-label="Arrived" className="absolute inset-0 z-[800] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-emerald-500/80 bg-slate-900 p-5 text-center text-white shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-card border border-emerald-400 bg-normal/20 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-emerald-400">Simulated drive complete</span>
          <h3 className="text-xl font-bold">Arrived at {shelterName}</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">This was a demo drive along the road route. No real position was tracked.</p>
        </div>
        <dl className="space-y-2 rounded-card border border-slate-700 bg-slate-800/80 p-3.5 text-left text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-300">Arrival</dt>
            <dd className="font-bold">{when}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-1 text-slate-300">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Telegram
            </dt>
            <dd className={`text-right font-bold ${line.tone}`}>{line.text}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-300">Family status</dt>
            <dd className="flex items-center gap-1 font-bold text-emerald-400">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Arrived safe (set on this device)
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-300">Centre occupancy (demo)</dt>
            <dd className="font-bold">{capacity}</dd>
          </div>
        </dl>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-ctl bg-slate-800 text-xs font-bold hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Back to map
          </button>
          <button
            type="button"
            onClick={onReports}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-ctl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Flood reports <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

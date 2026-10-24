import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const read = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

/** Shown while the phone has no connection. What is on screen is what loaded last; it does not update until the signal returns. */
export function OfflineBanner() {
  const [online, setOnline] = useState(read);
  const [since, setSince] = useState<Date | null>(null);
  useEffect(() => {
    const on = () => { setOnline(true); setSince(null); };
    const off = () => { setOnline(false); setSince(new Date()); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="flex items-start gap-2 bg-warning-bg px-4 py-2.5 text-sm text-warning">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p><b>No connection.</b> You are seeing what loaded last{since ? ` (offline since ${since.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}. It will update when the signal returns. If you are in danger, call 999.</p>
    </div>
  );
}

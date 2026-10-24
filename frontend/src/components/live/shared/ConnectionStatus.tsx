import { CloudOff } from 'lucide-react';
import { pill } from './ui';

interface Props {
  usingMock: boolean;
  connected: boolean;
  forcedMock: boolean;
  online: number;
  total: number;
}

/** Title-row status: how many cameras are up, and whether the page is on live data. */
export function ConnectionChip({ usingMock, connected, online, total }: Omit<Props, 'forcedMock'>) {
  const dot = usingMock ? 'bg-warning-bg0' : connected ? 'bg-normal-bg0' : 'bg-warning-bg0 motion-safe:animate-pulse';
  const word = usingMock ? 'Sample data' : connected ? 'Live' : 'Reconnecting';
  return (
    <span className={pill} role="status">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <span>{word}</span>
      <span className="text-slate-300" aria-hidden="true">|</span>
      <span className="tabular-nums">{online} / {total} online</span>
    </span>
  );
}

/** One calm line, shown only when the server cannot be reached. The store keeps retrying on its own. */
export function OfflineNotice({ forcedMock, error }: { forcedMock: boolean; error: string | null }) {
  return (
    <p className="flex items-center gap-2 rounded-ctl border border-transparent bg-warning-bg px-3 py-2 text-sm/5 text-warning">
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        {forcedMock ? (
          <>Mock mode: showing labelled sample cameras, not real feeds.</>
        ) : (
          <>
            <span className="font-semibold">Server unreachable.</span> Showing labelled sample cameras until it reconnects
            <span className="sr-only">{error ? ` (${error})` : ''}</span>.
          </>
        )}
      </span>
    </p>
  );
}

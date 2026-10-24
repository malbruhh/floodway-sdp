import { LEVEL_META } from '../../../lib/vision/levels';
import type { Level } from '../../../types/vision';

interface Props {
  level: Level;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE = { sm: 'gap-1 px-2 py-0.5 text-xs/4', md: 'gap-1.5 px-2.5 py-1 text-sm/5' };

/** Status is never colour alone: colour + icon + word. */
export function StatusChip({ level, size = 'sm', className = '' }: Props) {
  const meta = LEVEL_META[level];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-semibold tracking-wide ${SIZE[size]} ${meta.chip} ${className}`}>
      <Icon className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {meta.label.toUpperCase()}
    </span>
  );
}

export function OfflineChip({ label = 'OFFLINE', size = 'sm', className = '' }: { label?: string; size?: 'sm' | 'md'; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-control bg-raised font-semibold tracking-wide text-muted ${SIZE[size]} ${className}`}>{label}</span>;
}

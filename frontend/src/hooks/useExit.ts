import { useEffect, useState } from 'react';

/**
 * Keeps something mounted while its exit animation plays. `open` goes false -> `closing` is true for `ms`, then
 * `mounted` goes false. Reuse it for every sheet, menu, banner and toast so open and close feel the same.
 */
export function useExit(open: boolean, ms = 220): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted: open || mounted, closing: !open && mounted };
}

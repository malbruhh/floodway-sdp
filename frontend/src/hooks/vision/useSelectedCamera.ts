import { useState } from 'react';
import type { Camera } from '../../types/vision';

/**
 * The visible list is sorted most-urgent first. Until the user picks a camera themselves we follow the top of
 * that list, so a camera reaching DANGER is what you see first. Once they pick one, their choice sticks
 * (and falls back to the top of the list if that camera is filtered out or removed).
 */
export function useSelectedCamera(visible: Camera[], initialId: string | null = null) {
  const [manualId, setManualId] = useState<string | null>(initialId);
  const picked = manualId !== null ? visible.find((c) => c.id === manualId) : undefined;
  const selected = picked ?? visible[0] ?? null;
  return { selected, selectedId: selected?.id ?? null, setSelectedId: setManualId };
}

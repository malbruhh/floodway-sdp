export type JpsStatus = 'online' | 'stale' | 'offline';

export interface JpsCamera {
  id: number;
  name: string;
  district: string;
  river_basin: string | null;
  lat: number;
  lon: number;
  status: JpsStatus;
  last_update: string | null;
  age_s: number | null;
  image_path: string;
  reading: 'image_only';
}

export interface JpsCameraList {
  source: string;
  fetched_at: number;
  stale: boolean;
  count: number;
  cameras: JpsCamera[];
}

export const JPS_STATUS: Record<JpsStatus, { label: string; hex: string; chip: string }> = {
  online: { label: 'Online', hex: '#10B981', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  stale: { label: 'Stale', hex: '#F59E0B', chip: 'bg-amber-50 text-amber-900 ring-amber-200' },
  offline: { label: 'Offline', hex: '#94A3B8', chip: 'bg-slate-100 text-slate-700 ring-slate-300' },
};

/** "just now", "5 min ago", "3 h ago", "2 d ago"; "unknown" when JPS gave no usable time. */
export function ageText(ageS: number | null): string {
  if (ageS == null || !Number.isFinite(ageS)) return 'unknown';
  if (ageS < 90) return 'just now';
  if (ageS < 3600) return `${Math.round(ageS / 60)} min ago`;
  if (ageS < 86400) return `${Math.round(ageS / 3600)} h ago`;
  return `${Math.round(ageS / 86400)} d ago`;
}

export const JPS_LABEL = 'JPS Selangor public snapshot. Image only: no AI water reading.';

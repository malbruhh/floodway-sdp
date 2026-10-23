import { ChevronDown, MapPin, Search } from 'lucide-react';
import type { CameraTab } from '../../../hooks/vision/useNearbyCameras';
import type { Place } from '../../../lib/vision/geo';
import { Segmented } from '../shared/Segmented';
import { focusRing } from '../shared/ui';

interface Props {
  places: Place[];
  placeId: string;
  onPlace: (id: string) => void;
  radiusKm: number;
  onRadius: (km: number) => void;
  tab: CameraTab;
  onTab: (tab: CameraTab) => void;
  query: string;
  onQuery: (q: string) => void;
}

const TABS: { id: CameraTab; label: string }[] = [
  { id: 'nearby', label: 'Nearby' },
  { id: 'city', label: 'City' },
  { id: 'mine', label: 'My cameras' },
];
const RADII = [1, 3, 5];

export function NearbyFilters({ places, placeId, onPlace, radiusKm, onRadius, tab, onTab, query, onQuery }: Props) {
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Your location</span>
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-link" aria-hidden="true" />
        <select value={placeId} onChange={(e) => onPlace(e.target.value)} className={`min-h-11 w-full appearance-none rounded-ctl border border-line bg-slate-50 pl-9 pr-9 text-sm font-semibold text-ink ${focusRing}`}>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      </label>

      <Segmented kind="tabs" label="Camera source" options={TABS} value={tab} onChange={onTab} />

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-muted">Radius</span>
        <div className="flex-1">
          <Segmented label="Search radius" options={RADII.map((km) => ({ id: km, label: `${km} km` }))} value={radiusKm} onChange={onRadius} />
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">Search cameras</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search cameras…" className={`min-h-11 w-full rounded-ctl border border-line bg-slate-50 pl-9 pr-3 text-sm text-ink placeholder:text-muted ${focusRing}`} />
      </label>
    </div>
  );
}

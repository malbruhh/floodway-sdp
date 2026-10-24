import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2 } from 'lucide-react';
import { BASEMAP_ATTRIBUTION, BASEMAP_MAX_ZOOM, BASEMAP_URL } from '../../config/mapConfig';
import { useApp } from '../../contexts/AppContext';
import { useVisionHazards } from '../../hooks/vision/useVisionHazards';
import { nearestOpenShelter } from '../../lib/home';
import { DEMO_ORIGIN } from '../../lib/mappers';
import { detourAroundHazards, hazardsKey } from '../../lib/vision/hazards';
import { VisionHazardLayer } from '../map/VisionHazardLayer';
import { Skeleton } from '../live/shared/Skeleton';

const userDot = new L.DivIcon({
  className: 'user-mini-icon',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#1d5fbf;border:3px solid #fff;box-shadow:0 0 0 4px rgba(29,95,191,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const shelterPin = new L.DivIcon({
  className: 'shelter-mini-icon',
  html: '<div style="background:#047857;color:#fff;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/** Leaflet measures its container once; this re-measures whenever the container's size changes. */
function ResizeFix() {
  const map = useMap();
  React.useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [map]);
  return null;
}

/** Overview map: you, the nearest open refuge, an approximate route, and sample-camera flood zones. */
export function HomeMap() {
  const navigate = useNavigate();
  const { shelters, sheltersReady } = useApp();
  const hazards = useVisionHazards();
  const key = hazardsKey(hazards);
  const shelter = nearestOpenShelter(shelters);

  const route = useMemo(() => {
    if (!shelter) return null;
    const base: [number, number][] = [[DEMO_ORIGIN.lat, DEMO_ORIGIN.lon], [shelter.lat, shelter.lon]];
    return detourAroundHazards(base, hazards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelter?.id, key]);

  if (!sheltersReady) return <Skeleton className="h-80 w-full" />;

  const points: [number, number][] = [[DEMO_ORIGIN.lat, DEMO_ORIGIN.lon], ...(shelter ? ([[shelter.lat, shelter.lon]] as [number, number][]) : []), ...hazards.map((h) => [h.lat, h.lon] as [number, number])];
  const bounds = L.latLngBounds(points).pad(0.3);

  return (
    <div className="grid gap-2">
      <div className="relative h-[200px] overflow-hidden rounded-media">
        <MapContainer bounds={bounds} zoomControl={false} scrollWheelZoom={false} dragging={false} touchZoom={false} doubleClickZoom={false} attributionControl className="z-0 h-full w-full">
          <TileLayer attribution={BASEMAP_ATTRIBUTION} url={BASEMAP_URL} maxZoom={BASEMAP_MAX_ZOOM} />
          <ResizeFix />
          <VisionHazardLayer />
          {route && (
            <>
              <Polyline positions={route.route} pathOptions={{ color: '#FFFFFF', weight: 9, opacity: 0.85 }} />
              <Polyline positions={route.route} pathOptions={{ color: '#1d5fbf', weight: 5, opacity: 0.95, dashArray: '8 8' }} />
            </>
          )}
          <Marker position={[DEMO_ORIGIN.lat, DEMO_ORIGIN.lon]} icon={userDot} />
          {shelter && <Marker position={[shelter.lat, shelter.lon]} icon={shelterPin} />}
        </MapContainer>
      </div>
      <button type="button" onClick={() => navigate('/map')} className="flex min-h-11 items-center gap-1.5 justify-self-start text-sm font-medium text-link">
        Open full map <Maximize2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

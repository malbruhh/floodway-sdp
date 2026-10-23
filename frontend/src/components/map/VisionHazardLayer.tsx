import { useEffect } from 'react';
import { Circle, Popup, useMap } from 'react-leaflet';
import { useSearchParams } from 'react-router-dom';
import { useVisionHazards } from '../../hooks/vision/useVisionHazards';
import { useVisionStore } from '../../hooks/vision/useVisionStore';
import { LEVEL_META } from '../../lib/vision/levels';

/**
 * Drop-in child for your <MapContainer>. Draws a flood zone around every camera at WARNING or DANGER and,
 * when the page was opened with ?focus=<cameraId> (from the Live Vision "Show evacuation routes" button),
 * flies the map to that camera.
 *
 *   <MapContainer ...>
 *     <TileLayer ... />
 *     <VisionHazardLayer />
 *     ...your existing layers...
 *   </MapContainer>
 */
export function VisionHazardLayer() {
  const map = useMap();
  const hazards = useVisionHazards();
  const { cameras } = useVisionStore();
  const [params] = useSearchParams();
  const focusId = params.get('focus');

  useEffect(() => {
    if (!focusId) return;
    const cam = cameras.find((c) => c.id === focusId);
    if (cam) map.flyTo([cam.lat, cam.lon], 15, { duration: 1.2 });
    // only re-run when the requested camera changes, not on every reading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, cameras.length > 0]);

  return (
    <>
      {hazards.map((h) => (
        <Circle
          key={h.cameraId}
          center={[h.lat, h.lon]}
          radius={h.radiusM}
          // Solid outline and a stronger fill: camera zones read as "live from a camera", unlike the dashed demo basins.
          pathOptions={{ color: LEVEL_META[h.level].hex, fillColor: LEVEL_META[h.level].hex, fillOpacity: h.level === 'DANGER' ? 0.42 : 0.32, weight: 3 }}
        >
          <Popup>
            <strong>{h.name}</strong>
            <br />
            {LEVEL_META[h.level].label}: water at {Math.round(h.waterRatio * 100)}% up the bank.
            <br />
            Sample camera (simulated). The route is adjusted around this zone, approximately.
          </Popup>
        </Circle>
      ))}
    </>
  );
}

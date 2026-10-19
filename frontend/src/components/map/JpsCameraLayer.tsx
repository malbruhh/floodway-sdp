import { CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { JPS_STATUS, ageText } from '../../lib/jps';
import { jpsImageUrl } from '../../services/jps';
import { useJpsCameras } from '../../hooks/useJpsCameras';

/** Drop-in child for <MapContainer>: one small dot per JPS Selangor camera, coloured by feed status (not by flood level). */
export function JpsCameraLayer() {
  const { data } = useJpsCameras();
  return (
    <>
      {(data?.cameras ?? []).map((c) => {
        const s = JPS_STATUS[c.status];
        return (
          <CircleMarker key={c.id} center={[c.lat, c.lon]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: s.hex, fillOpacity: 0.95 }}>
            <Popup minWidth={200}>
              <strong>{c.name}</strong>
              <br />
              {c.district}: {s.label.toLowerCase()}, updated {ageText(c.age_s)}
              <img src={jpsImageUrl(c)} alt={`Latest snapshot: ${c.name}`} loading="lazy" style={{ width: 200, marginTop: 6, borderRadius: 8 }} />
              <small>JPS Selangor public snapshot. Image only, no AI water reading.</small>
              <br />
              <Link to="/jps">All JPS cameras</Link>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

import type { JpsCamera, JpsCameraList } from '../lib/jps';
import { API_BASE } from './vision/config';

export async function fetchJpsCameras(signal?: AbortSignal): Promise<JpsCameraList> {
  const res = await fetch(`${API_BASE}/api/v1/jps/cameras`, { signal });
  if (!res.ok) throw new Error(`JPS cameras: HTTP ${res.status}`);
  return (await res.json()) as JpsCameraList;
}

/** The backend proxies the JPEG (JPS serves plain http and blocks other origins). `last_update` busts the cache when JPS rewrites it. */
export function jpsImageUrl(cam: Pick<JpsCamera, 'image_path' | 'last_update'>): string {
  return `${API_BASE}${cam.image_path}?v=${encodeURIComponent(cam.last_update ?? '')}`;
}

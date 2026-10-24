import type { ReactNode } from 'react';
import type { CameraWithDistance } from '../../../hooks/vision/useNearbyCameras';
import type { Reading } from '../../../types/vision';
import { AddCameraCard } from './AddCameraCard';
import { CameraCard } from './CameraCard';
import { useWeather } from '../../../hooks/useWeather';
import { weatherKey } from '../../../services/weather';

interface Props {
  items: CameraWithDistance[];
  history: Record<string, Reading[]>;
  selectedId: string | null;
  useScene: boolean;
  empty: ReactNode;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function CameraList({ items, history, selectedId, useScene, empty, onSelect, onAdd }: Props) {
  const weather = useWeather(items.map((i) => i.camera));
  if (items.length === 0) return <>{empty}</>;
  return (
    <ul className="space-y-3" aria-label="Cameras">
      {items.map(({ camera, distanceKm }) => (
        <li key={camera.id}>
          <CameraCard weather={weather[weatherKey(camera.lat, camera.lon)]} camera={camera} distanceKm={distanceKm} history={history[camera.id] ?? []} selected={camera.id === selectedId} useScene={useScene} onSelect={() => onSelect(camera.id)} />
        </li>
      ))}
      <li>
        <AddCameraCard onClick={onAdd} />
      </li>
    </ul>
  );
}

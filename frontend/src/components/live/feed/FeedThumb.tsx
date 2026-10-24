import { WifiOff } from 'lucide-react';
import { frameUrl } from '../../../services/vision/visionApi';
import type { Camera } from '../../../types/vision';
import { SampleFrame } from './SampleFrame';

interface Props {
  camera: Camera;
  useScene: boolean;
  className?: string;
}

/** Small 16:9 thumbnail for cards and the camera strip. Size comes from `className`. */
export function FeedThumb({ camera, useScene, className = 'aspect-video w-full' }: Props) {
  return (
    <span className={`relative block overflow-hidden rounded-lg bg-slate-200 ${className}`}>
      {!camera.online ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-slate-200 text-xs/4 font-medium text-muted">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          No signal
        </span>
      ) : useScene ? (
        <SampleFrame cameraId={camera.id} ratio={camera.reading?.water_ratio ?? 0} className="h-full w-full object-cover" />
      ) : !camera.reading ? (
        <span className="flex h-full w-full items-center justify-center text-xs/4 font-medium text-muted">Waiting…</span>
      ) : (
        <img src={frameUrl(camera.id, camera.reading.timestamp)} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

import { ImagePlus } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from '../../../services/vision/visionApi';
import type { CameraDraft } from '../../../types/vision';
import { focusRing } from '../shared/ui';

export interface SourceForm {
  name: string;
  source_type: CameraDraft['source_type'];
  source_url: string;
  username: string;
  password: string;
  lat: string;
  lon: string;
  feed_refresh_s: number;
  photo: File | null;
}

/** Browser-side check so a wrong file fails at once, before any upload. The server checks again. */
export function photoProblem(file: File | null): string | null {
  if (!file) return 'Choose a photo of the river or drain.';
  if (!PHOTO_TYPES.includes(file.type)) return 'Use a JPEG or PNG photo.';
  if (file.size > MAX_PHOTO_BYTES) return 'That photo is larger than 5 MB. Choose a smaller one.';
  return null;
}

interface Props {
  form: SourceForm;
  onChange: (next: SourceForm) => void;
  error: string | null;
  onUseMyLocation: (() => void) | null;
}

const input = `min-h-11 w-full rounded-ctl border border-control bg-surface px-3 text-sm text-ink placeholder:text-muted ${focusRing}`;
const label = 'mb-1 block text-sm font-semibold text-ink';

export function StepSource({ form, onChange, error, onUseMyLocation }: Props) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  // The error sits under the form; bring it into view so the user sees why nothing happened.
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [error]);
  const set = <K extends keyof SourceForm>(key: K, value: SourceForm[K]) => onChange({ ...form, [key]: value });
  const types: { id: CameraDraft['source_type']; text: string }[] = [
    { id: 'stream', text: 'Live video link' },
    { id: 'snapshot', text: 'Picture link' },
    { id: 'upload', text: 'Upload a photo' },
  ];
  const isUpload = form.source_type === 'upload';
  const photoUrl = useMemo(() => (form.photo ? URL.createObjectURL(form.photo) : null), [form.photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  return (
    <div className="space-y-4">
      <div>
        <span className={label} id="src-type">Camera source</span>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby="src-type">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={form.source_type === t.id}
              onClick={() => onChange({ ...form, source_type: t.id, feed_refresh_s: t.id === 'upload' ? 0 : form.feed_refresh_s })}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-ctl border-2 px-3 text-sm font-bold ${focusRing} ${
                form.source_type === t.id ? 'border-action bg-advisory-bg text-link' : 'border-line text-muted hover:border-control'
              }`}
            >
              {t.text}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="cam-name" className={label}>Camera name</label>
        <input id="cam-name" className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Kampung Baru Drain" maxLength={80} autoComplete="off" />
      </div>

      {isUpload ? (
        <div>
          <span className={label} id="cam-photo-label">Photo of the water</span>
          <label htmlFor="cam-photo" className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-2 border-dashed border-control bg-slate-50 p-3 text-center text-sm font-semibold text-muted hover:border-action hover:bg-advisory-bg focus-within:ring-2 focus-within:ring-[#1677FF] ${photoUrl ? 'p-0' : ''}`}>
            {photoUrl ? (
              <img src={photoUrl} alt="The photo you chose" className="max-h-56 w-full object-contain" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6 text-link" aria-hidden="true" />
                Choose a photo or take one
                <span className="text-xs font-normal text-muted">JPEG or PNG, up to 5 MB</span>
              </>
            )}
            <input id="cam-photo" type="file" accept="image/jpeg,image/png" className="sr-only" aria-labelledby="cam-photo-label" onChange={(e) => set('photo', e.target.files?.[0] ?? null)} />
          </label>
          {form.photo && <p className="mt-1 truncate text-xs text-muted">{form.photo.name} · tap the photo to change it</p>}
          <p className="mt-1 text-xs text-muted">A photo does not change, so the reading repeats. Use it to try calibration, or add a stream or snapshot URL to watch live water.</p>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="cam-url" className={label}>{form.source_type === 'stream' ? 'Link to the live video' : 'Link to the picture'}</label>
            <input id="cam-url" className={input} value={form.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder={form.source_type === 'stream' ? 'rtsp://camera.example.com/stream1' : 'https://camera.example.com/snapshot.jpg'} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cam-user" className={label}>Username <span className="font-normal text-muted">(optional)</span></label>
            <input id="cam-user" className={input} value={form.username} onChange={(e) => set('username', e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="cam-pass" className={label}>Password <span className="font-normal text-muted">(optional)</span></label>
            <input id="cam-pass" type="password" className={input} value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">Credentials are sent to the FloodWay server over HTTPS and are never stored in your browser or saved to disk.</p>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cam-lat" className={label}>North-south position (latitude)</label>
          <input id="cam-lat" className={`${input} font-mono`} value={form.lat} onChange={(e) => set('lat', e.target.value)} inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="cam-lon" className={label}>East-west position (longitude)</label>
          <input id="cam-lon" className={`${input} font-mono`} value={form.lon} onChange={(e) => set('lon', e.target.value)} inputMode="decimal" />
        </div>
      </div>
      {onUseMyLocation && (
        <button type="button" onClick={onUseMyLocation} className={`-mt-1 min-h-10 rounded-lg px-2 text-sm font-bold text-link hover:bg-advisory-bg ${focusRing}`}>
          Use my location
        </button>
      )}

      {!isUpload && (
        <div>
          <label htmlFor="cam-refresh" className={label}>How often does the source refresh?</label>
          <select id="cam-refresh" className={input} value={form.feed_refresh_s} onChange={(e) => set('feed_refresh_s', Number(e.target.value))}>
            <option value={0}>All the time (live video or fast pictures)</option>
            <option value={60}>Every minute</option>
            <option value={300}>Every 5 minutes</option>
            <option value={900}>Every 15 minutes</option>
          </select>
          <p className="mt-1 text-xs text-muted">Slow public feeds can only be analysed as often as they update. We flag them as stale if they stop.</p>
        </div>
      )}

      {error && (
        <p ref={errorRef} role="alert" className="rounded-ctl border border-transparent bg-danger-bg px-3 py-2 text-sm/5 font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

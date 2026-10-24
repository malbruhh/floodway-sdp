import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { visionActions } from '../../../hooks/vision/useVisionStore';
import { linesAreValid } from '../../../lib/vision/thresholds';
import { ApiError, previewFrame, testCamera, uploadPhoto } from '../../../services/vision/visionApi';
import type { Calibration, CameraDraft, Reading } from '../../../types/vision';
import { btnPrimary, btnSecondary, focusRing, heading } from '../shared/ui';
import { DEFAULT_LINES, StepCalibrate } from './StepCalibrate';
import { StepSource } from './StepSource';
import { photoProblem } from './StepSource';
import type { SourceForm } from './StepSource';
import { StepTest } from './StepTest';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (cameraId: string) => void;
  origin: { lat: number; lon: number };
  offlineDemo: boolean; // backend unreachable: use the vector scene + a sample result
  gpsAvailable: boolean;
}

const STEPS = ['Where from', 'Mark the water', 'Test and save'] as const;

function validateSource(f: SourceForm): string | null {
  if (f.name.trim().length < 2) return 'Give the camera a name.';
  if (f.source_type === 'upload') return photoProblem(f.photo) ?? validateLocation(f);
  if (!/^(https?|rtsps?):\/\/.+/i.test(f.source_url.trim())) return 'Enter a full URL starting with http://, https:// or rtsp://.';
  if (/^[^:]+:\/\/[^/]*@/.test(f.source_url.trim())) return 'Put the username and password in their own fields, not in the URL.';
  if (Boolean(f.username) !== Boolean(f.password)) return 'Enter both a username and a password, or neither.';
  return validateLocation(f);
}

function validateLocation(f: SourceForm): string | null {
  const lat = Number(f.lat);
  const lon = Number(f.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitude must be a number between -90 and 90.';
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return 'Longitude must be a number between -180 and 180.';
  return null;
}

export function AddCameraWizard({ open, onClose, onSaved, origin, offlineDemo, gpsAvailable }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SourceForm>({ name: '', source_type: 'snapshot', source_url: '', username: '', password: '', lat: origin.lat.toFixed(4), lon: origin.lon.toFixed(4), feed_refresh_s: 0, photo: null });
  const uploaded = useRef<{ file: File; ref: string } | null>(null); // reuse the stored photo when the user steps back and forward
  const [calibration, setCalibration] = useState<Calibration>({ roi: [], lines: DEFAULT_LINES });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const buildDraft = useCallback((): CameraDraft => ({
    name: form.name.trim(), provider: 'mine', lat: Number(form.lat), lon: Number(form.lon),
    source_type: form.source_type, source_url: form.source_url.trim(),
    username: form.username || undefined, password: form.password || undefined,
    interval_s: 8, feed_refresh_s: form.feed_refresh_s, calibration,
  }), [form, calibration]);

  const reset = useCallback(() => {
    setStep(0); setError(null); setTestError(null); setReading(null); setBusy(false); setTesting(false);
    setCalibration({ roi: [], lines: DEFAULT_LINES });
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    uploaded.current = null;
    setForm((f) => ({ ...f, name: '', source_url: '', photo: null, username: '', password: '', lat: origin.lat.toFixed(4), lon: origin.lon.toFixed(4) }));
  }, [origin.lat, origin.lon]);

  const close = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  // Escape closes, focus moves into the dialog and stays there (Tab wraps), page scroll is locked,
  // and focus returns to whatever opened the dialog.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab' || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; opener?.focus?.(); };
  }, [open, close]);

  const runTest = useCallback(async () => {
    setTesting(true); setTestError(null); setReading(null);
    try {
      if (offlineDemo) {
        await new Promise((r) => setTimeout(r, 900));
        setReading({ camera_id: 'draft', timestamp: new Date().toISOString(), window_seconds: 2.4, frames_analyzed: 5, water_ratio: 0.31, waterline_y: 0.6, level: 'ADVISORY', observed_level: 'ADVISORY', confidence: 0.9, low_confidence: false, lines_crossed: ['normal'], trend: 'steady', model: 'sample-data', latency_ms: 900, action: 'show_on_map' });
      } else {
        setReading(await testCamera(buildDraft()));
      }
    } catch (err) {
      setTestError(err instanceof ApiError || err instanceof Error ? err.message : 'The test failed.');
    } finally {
      setTesting(false);
    }
  }, [offlineDemo, buildDraft]);

  const next = async () => {
    setError(null);
    if (step === 0) {
      const problem = validateSource(form);
      if (problem) return setError(problem);
      if (offlineDemo && form.source_type === 'upload') return setError('Photo upload needs the FloodWay server, which is not reachable right now.');
      if (offlineDemo) { setPreviewUrl(null); return setStep(1); }
      setBusy(true);
      try {
        let sourceUrl = form.source_url.trim();
        if (form.source_type === 'upload' && form.photo) {
          if (uploaded.current?.file !== form.photo) uploaded.current = { file: form.photo, ref: await uploadPhoto(form.photo) };
          sourceUrl = uploaded.current.ref;
          setForm((f) => ({ ...f, source_url: sourceUrl }));
        }
        const url = await previewFrame({ source_type: form.source_type, source_url: sourceUrl, username: form.username || undefined, password: form.password || undefined });
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        setStep(1);
      } catch (err) {
        if (err instanceof ApiError && err.status === 413) setError('That photo is larger than 5 MB. Choose a smaller one.');
        else if (err instanceof ApiError && err.status === 422) setError(form.source_type === 'upload' ? `This photo can't be used: ${err.message}.` : `This URL can't be used: ${err.message}.`);
        else setError(err instanceof Error ? `Could not get a frame from that camera: ${err.message}` : 'Could not reach that camera.');
      } finally {
        setBusy(false);
      }
    } else if (step === 1) {
      setStep(2);
      void runTest();
    }
  };

  const save = async () => {
    setBusy(true); setTestError(null);
    try {
      const cam = await visionActions.addCamera(buildDraft());
      onSaved(cam.id);
      close();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Could not save the camera.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  const canNext = step === 1 ? linesAreValid(calibration) : true;

  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-slate-900/60" onClick={close} aria-hidden="true" />
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="wiz-title" className="relative flex h-[100dvh] w-full flex-col bg-surface shadow-xl focus:outline-none sm:h-auto sm:max-h-[min(92dvh,880px)] sm:max-w-[720px] sm:rounded-card">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 id="wiz-title" className={`${heading} text-lg/7`}>Add my camera</h2>
            <p className="text-xs/4 text-muted">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-muted hover:bg-raised ${focusRing}`}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ol className="flex items-center gap-2 px-4 pt-4 sm:px-6" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i < step ? 'bg-normal text-white' : i === step ? 'bg-action text-white' : 'bg-slate-200 text-muted'}`}>
                {i < step ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                <span className="sr-only">{i < step ? ' (done)' : ''}</span>
              </span>
              <span className={`hidden text-sm font-semibold sm:inline ${i === step ? 'text-ink' : 'text-muted'}`}>{label}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {step === 0 && <StepSource form={form} onChange={setForm} error={error} onUseMyLocation={gpsAvailable ? () => setForm({ ...form, lat: origin.lat.toFixed(4), lon: origin.lon.toFixed(4) }) : null} />}
          {step === 1 && <StepCalibrate imageUrl={previewUrl} value={calibration} onChange={setCalibration} />}
          {step === 2 && <StepTest loading={testing} error={testError} reading={reading} offlineSample={offlineDemo} onRetry={runTest} />}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-rule bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-2xl sm:px-6 sm:py-4">
          <button type="button" onClick={() => (step === 0 ? close() : setStep(step - 1))} className={btnSecondary}>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 2 ? (
            <button type="button" onClick={next} disabled={busy || !canNext} className={btnPrimary}>
              {busy ? 'Checking camera…' : 'Next'}
            </button>
          ) : (
            <button type="button" onClick={save} disabled={busy || testing || !reading} className={btnPrimary}>
              {busy ? 'Saving…' : 'Save camera'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

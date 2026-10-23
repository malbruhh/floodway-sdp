import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImagePlus, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeFloodImage } from '../../services/geminiVisionService';
import { submitReport } from '../../services/api';
import { dispatchFloodIncidentReportAlert } from '../../services/telegramService';
import { AiVerificationResult, CitizenReport } from '../../types';
import { depthWords, validateReport, type ReportFormErrors } from '../../lib/reportForm';
import { passability, type DepthRange } from '../../lib/photoDepth';
import { Field } from '../ui/Field';
import { Sheet } from '../ui/Sheet';
import { DepthFromPhoto } from './DepthFromPhoto';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Example photos for trying the form without a real one. They are examples, not real incidents at the place named.
const EXAMPLES = [
  { src: '/banjir_drain.jpg', label: 'Drain overflow', title: 'Drain overflowing onto the road', depth: 38 },
  { src: '/banjir_underpass.jpg', label: 'Underpass', title: 'Water collecting in the underpass', depth: 42 },
  { src: '/banjir2.jpg', label: 'Road spillover', title: 'Water spilling over the road', depth: 35 },
  { src: '/banjir3.jfif', label: 'Blocked drain', title: 'Drain blocked and road under water', depth: 50 },
];

type Sent = { savedOnServer: boolean; aiAssessed: boolean };

export function ReportModal({ isOpen, onClose }: Props) {
  const { addReport, selectedLocation } = useApp();
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState(selectedLocation || '');
  const [depthCm, setDepthCm] = useState(30);
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ReportFormErrors>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<AiVerificationResult | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [photoDepth, setPhotoDepth] = useState<{ range: DepthRange; object: string } | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  // An estimate and an AI result belong to one photo: drop them when the photo changes.
  useEffect(() => { setPhotoDepth(null); setMeasuring(false); setAiResult(null); }, [image]);
  // A fresh form each time the sheet opens.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(''); setLocation(selectedLocation || ''); setDepthCm(30); setImage(null); setErrors({}); setSent(null); setAiResult(null);
  }, [isOpen, selectedLocation]);

  const pass = passability(depthCm);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setErrors((e) => ({ ...e })); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { if (typeof ev.target?.result === 'string') setImage(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const runAi = async () => {
    if (!image) return;
    setAnalyzing(true);
    setAiResult(await analyzeFloodImage({ imageUrl: image, userDescription: title, reportedDepthCm: depthCm }));
    setAnalyzing(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateReport(title, location);
    setErrors(found);
    if (found.title || found.location) return;

    // Only claim what actually happened: AI assessed means the check ran and judged it flooding.
    const aiAssessed = Boolean(aiResult?.ran && aiResult.verified);
    const author = user?.name || 'Resident';
    setSubmitting(true);
    const local: CitizenReport = {
      id: `rep-${Date.now()}`,
      title: title.trim(),
      location: location.trim(),
      lat: 3.1642,
      lon: 101.7031,
      waterDepthCm: depthCm,
      status: aiAssessed ? 'AI_VERIFIED' : 'UNDER_REVIEW',
      verifiedBy: aiAssessed ? 'AI assessment (not an official verification)' : 'Not yet reviewed',
      timestampStr: 'Just now',
      author,
      upvotes: 1,
      imageUrl: image ?? undefined,
      description: `Reported flood incident. Depth reported by the user: ${depthCm} cm.${photoDepth ? ` Photo estimate using a ${photoDepth.object.toLowerCase()} as reference: ${photoDepth.range.minCm} to ${photoDepth.range.maxCm} cm.` : ''}${aiAssessed ? ' A visual AI assessment judged the photo to show flooding.' : ' No AI check was completed.'}`,
      aiVerification: aiResult ?? undefined,
    };
    const saved = await submitReport(local);
    addReport(saved ? { ...saved, imageUrl: image ?? undefined, aiVerification: local.aiVerification } : local);
    setSubmitting(false);
    dispatchFloodIncidentReportAlert({ title: local.title, location: local.location, waterDepthCm: depthCm, author, hasPhotoEvidence: !!image });
    setSent({ savedOnServer: Boolean(saved), aiAssessed });
  };

  if (sent) {
    return (
      <Sheet open={isOpen} onClose={onClose} title="Report sent" footer={<button type="button" onClick={onClose} className="min-h-12 w-full rounded-btn bg-action font-medium text-white">Done</button>}>
        <div className="grid gap-3 py-2" role="status">
          <CheckCircle2 className="h-10 w-10 text-normal" aria-hidden="true" />
          <p className="text-base">Thank you. Your report is in the list as <b>{sent.aiAssessed ? 'AI assessed' : 'not verified'}</b>.</p>
          {!sent.savedOnServer && <p className="rounded-ctl bg-warning-bg p-3 text-sm text-warning">Saved on this device only: the server did not accept it.</p>}
          <p className="text-sm text-muted">In this demo no agency reviews reports. If you or someone is in danger, call 999.</p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title="Report flooding"
      footer={
        <button type="submit" form="report-form" disabled={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-btn bg-action font-medium text-white disabled:opacity-60">
          <Send className="h-5 w-5" aria-hidden="true" /> {submitting ? 'Sending…' : 'Send report'}
        </button>
      }
    >
      <form id="report-form" onSubmit={submit} noValidate className="grid gap-4">
        <Field label="What do you see?" value={title} onChange={setTitle} error={errors.title} placeholder="Water over the road near the school" />
        <Field label="Where is it?" value={location} onChange={setLocation} error={errors.location} help="Street, area or landmark." autoComplete="street-address" />

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="depth" className="text-sm font-medium">How deep is the water?</label>
            <span className="text-sm"><b>{depthCm} cm</b>, <span className="text-muted">{depthWords(depthCm)}</span></span>
          </div>
          <input id="depth" type="range" min={5} max={150} value={depthCm} onChange={(e) => setDepthCm(Number(e.target.value))} className="h-11 w-full accent-action" />
          <div role="status" className={`rounded-ctl p-3 text-sm ${pass.tone === 'stop' ? 'bg-danger-bg text-danger' : pass.tone === 'care' ? 'bg-warning-bg text-warning' : 'bg-normal-bg text-normal'}`}>
            <p><b>Driving:</b> {pass.drive}</p>
            <p><b>On foot:</b> {pass.walk}</p>
            <p className="mt-1 text-xs">General guidance at {depthCm} cm, not an official advisory.</p>
          </div>
          {photoDepth && <p className="text-sm text-muted">Photo estimate ({photoDepth.object}): {photoDepth.range.minCm}–{photoDepth.range.maxCm} cm. The slider value is what you report.</p>}
          {image && (
            <button type="button" onClick={() => setMeasuring((m) => !m)} aria-expanded={measuring} className="flex min-h-11 items-center text-sm font-medium text-link">
              {measuring ? 'Hide photo measure' : 'Measure the depth from the photo'}
            </button>
          )}
          {measuring && image && (
            <DepthFromPhoto imageUrl={image} onApply={(range, object) => { setDepthCm(Math.min(150, Math.max(5, range.midCm))); setPhotoDepth({ range, object }); setMeasuring(false); }} />
          )}
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium">Photo <span className="font-normal text-muted">(optional, but it helps)</span></span>
          <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Choose a photo" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {image ? (
            <div className="flex items-center gap-3">
              <img src={image} alt="Your photo" className="h-20 w-20 rounded-media object-cover" />
              <div className="grid gap-1">
                <button type="button" onClick={() => fileInput.current?.click()} className="flex min-h-11 items-center text-sm font-medium text-link">Choose a different photo</button>
                <button type="button" onClick={() => setImage(null)} className="flex min-h-11 items-center text-sm font-medium text-danger">Remove photo</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileInput.current?.click()} className="flex min-h-14 items-center justify-center gap-2 rounded-btn bg-raised font-medium">
              <ImagePlus className="h-5 w-5" aria-hidden="true" /> Add a photo
            </button>
          )}
          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center text-link">No photo handy? Try an example</summary>
            <ul className="grid grid-cols-2 gap-2 pt-1">
              {EXAMPLES.map((x) => (
                <li key={x.src}>
                  <button type="button" onClick={() => { setImage(x.src); setTitle(x.title); setDepthCm(x.depth); }} className="min-h-11 w-full rounded-ctl bg-raised px-2 text-left">
                    <span className="block font-medium">{x.label}</span>
                    <span className="text-xs text-muted">Example photo, {x.depth} cm</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {image && (
          <div className="grid gap-2 rounded-card bg-raised p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Photo check (optional)</p>
            <p className="text-sm text-muted">An AI model looks at the photo and gives its opinion. It is not proof and no agency sees it.</p>
            <button type="button" onClick={runAi} disabled={analyzing} className="flex min-h-11 items-center justify-center gap-2 rounded-btn bg-surface font-medium ring-1 ring-line disabled:opacity-60">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> {analyzing ? 'Checking the photo…' : 'Check the photo'}
            </button>
            {aiResult && (
              <div role="status" className="grid gap-1 text-sm">
                {aiResult.ran ? (
                  <>
                    <p className="font-medium">{aiResult.verified ? 'AI opinion: looks like flooding' : 'AI opinion: could not confirm flooding'} (about {Math.round(aiResult.confidenceScore * 100)}% sure, ~{aiResult.estimatedDepthCm} cm)</p>
                    <p className="text-muted">Photo looks {aiResult.appearsAuthentic === true ? 'genuine' : aiResult.appearsAuthentic === false ? 'suspicious' : 'unclear to the model'}.{aiResult.detectedHazards.length > 0 && ` Hazards: ${aiResult.detectedHazards.join(', ')}.`}</p>
                  </>
                ) : (
                  <p className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span><b>Photo check unavailable.</b> {aiResult.notes}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-muted">Your report is saved as <b>not verified</b>. It shows as <b>AI assessed</b> only if you run the photo check and it judges the photo to show flooding.</p>
      </form>
    </Sheet>
  );
}

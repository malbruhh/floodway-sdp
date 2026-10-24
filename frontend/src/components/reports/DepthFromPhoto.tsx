import { useMemo, useRef, useState } from 'react';
import { Ruler, Undo2, RotateCcw } from 'lucide-react';
import { REF_OBJECTS, estimateDepth, type DepthRange, type Pt, type RefObjectId } from '../../lib/photoDepth';

interface Props {
  imageUrl: string;
  onApply: (range: DepthRange, objectLabel: string) => void;
}

export function DepthFromPhoto({ imageUrl, onApply }: Props) {
  const [objId, setObjId] = useState<RefObjectId>('car');
  const [pts, setPts] = useState<Pt[]>([]);
  const [aspect, setAspect] = useState(0.75);
  const boxRef = useRef<HTMLDivElement>(null);
  const obj = REF_OBJECTS.find((o) => o.id === objId)!;

  const range = useMemo(
    () => (pts.length === 3 ? estimateDepth(obj, pts[0], pts[1], pts[2], aspect) : null),
    [obj, pts, aspect],
  );
  const steps = [
    `Tap the ${obj.upperMark.toLowerCase()}`,
    `Tap the ${obj.lowerMark.toLowerCase()}, straight below`,
    'Tap where the water meets the object',
  ];

  const place = (e: React.MouseEvent) => {
    if (pts.length >= 3) return;
    const r = boxRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return;
    const pt = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    setPts((p) => (p.length >= 3 ? p : [...p, pt]));
  };

  return (
    <div className="p-3 rounded-card bg-slate-50 border border-line space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
        <Ruler className="w-4 h-4 text-link" aria-hidden="true" />
        <span>Depth from your photo</span>
      </div>
      <p className="text-xs text-muted">
        Pick an object in the water. Mark two points on it above the water, then the waterline. You get a range, because sizes and camera angles vary.
      </p>

      <div role="radiogroup" aria-label="Reference object" className="grid grid-cols-4 gap-1.5">
        {REF_OBJECTS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === objId}
            onClick={() => { setObjId(o.id); setPts([]); }}
            className={`text-xs py-1.5 rounded-lg border font-semibold cursor-pointer ${o.id === objId ? 'bg-advisory-bg border-advisory text-advisory' : 'bg-surface border-line text-muted hover:bg-raised'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{obj.hint}</p>

      <p role="status" className="text-xs font-semibold text-ink">
        {pts.length < 3 ? `Step ${pts.length + 1} of 3: ${steps[pts.length]}.` : range ? 'Done. Undo a point to adjust it.' : 'The marks must go top to bottom, with the waterline below the lower mark.'}
      </p>

      <div
        ref={boxRef}
        onClick={place}
        className="relative mx-auto w-fit max-w-full touch-none select-none overflow-hidden rounded-ctl border border-line bg-slate-900 cursor-crosshair"
      >
        <img
          src={imageUrl}
          alt="Your flood photo. Tap the two marks, then the waterline."
          draggable={false}
          onLoad={(e) => setAspect(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth || 0.75)}
          className="block max-h-64 max-w-full"
        />
        {pts.map((p, i) => (
          <span
            key={i}
            className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow ${i === 2 ? 'bg-sky-500' : 'bg-danger'}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button type="button" disabled={!pts.length} onClick={() => setPts(pts.slice(0, -1))} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-muted bg-surface border border-line disabled:opacity-40 flex items-center gap-1 cursor-pointer">
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Undo
          </button>
          <button type="button" disabled={!pts.length} onClick={() => setPts([])} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-muted bg-surface border border-line disabled:opacity-40 flex items-center gap-1 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset
          </button>
        </div>
        {range && (
          <button type="button" onClick={() => onApply(range, obj.label)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-action hover:bg-[#2b2b2b] cursor-pointer">
            Use {range.minCm}–{range.maxCm} cm
          </button>
        )}
      </div>
    </div>
  );
}

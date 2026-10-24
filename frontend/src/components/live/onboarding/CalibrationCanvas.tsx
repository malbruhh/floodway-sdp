import { GripHorizontal } from 'lucide-react';
import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { Calibration, Lines, Point } from '../../../types/vision';
import { useElementHeight } from '../../../hooks/vision/useElementSize';
import { spreadLabels } from '../../../lib/vision/labels';
import { RiverScene } from '../feed/RiverScene';

type LineKey = keyof Lines;
type Drag = { kind: 'line'; key: LineKey } | { kind: 'point'; index: number } | null;

const GAP = 0.03;
const PILL_PX = 36; // pill height plus breathing room
const LINE_ORDER: LineKey[] = ['danger', 'warning', 'normal']; // top to bottom
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const LINE_UI: Record<LineKey, { label: string; stroke: string; tag: string }> = {
  danger: { label: 'Danger', stroke: '#EF4444', tag: 'bg-danger text-white' },
  warning: { label: 'Warning', stroke: '#F59E0B', tag: 'bg-warning text-ink' },
  normal: { label: 'Normal', stroke: '#10B981', tag: 'bg-emerald-700 text-white' },
};

/** Keeps danger < warning < normal with a minimum gap, whichever handle moves. */
export function moveLine(lines: Lines, key: LineKey, y: number): Lines {
  if (key === 'danger') return { ...lines, danger: clamp(y, 0.02, lines.warning - GAP) };
  if (key === 'warning') return { ...lines, warning: clamp(y, lines.danger + GAP, lines.normal - GAP) };
  return { ...lines, normal: clamp(y, lines.warning + GAP, 0.98) };
}

interface Props {
  imageUrl: string | null; // null = vector sample scene (offline demo)
  value: Calibration;
  onChange: (next: Calibration) => void;
}

/** Tap to add zone points, drag points and the three lines. Everything is normalised to 0..1 of the frame. */
export function CalibrationCanvas({ imageUrl, value, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>(null);
  const height = useElementHeight(box);

  const toNorm = (e: { clientX: number; clientY: number }): Point => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return [0, 0];
    return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)];
  };

  const begin = (e: PointerEvent<HTMLElement>, d: Drag) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = d;
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toNorm(e);
    if (d.kind === 'line') onChange({ ...value, lines: moveLine(value.lines, d.key, y) });
    else onChange({ ...value, roi: value.roi.map((p, i) => (i === d.index ? ([x, y] as Point) : p)) });
  };

  const addPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    if (value.roi.length >= 32) return;
    onChange({ ...value, roi: [...value.roi, toNorm(e)] });
  };

  const keyLine = (e: KeyboardEvent<HTMLElement>, key: LineKey) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange({ ...value, lines: moveLine(value.lines, key, value.lines[key] + (e.key === 'ArrowUp' ? -step : step)) });
    }
  };

  const keyPoint = (e: KeyboardEvent<HTMLElement>, index: number) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const delta: Record<string, [number, number]> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    const d = delta[e.key];
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onChange({ ...value, roi: value.roi.filter((_, i) => i !== index) });
    } else if (d) {
      e.preventDefault();
      onChange({ ...value, roi: value.roi.map((p, i) => (i === index ? ([clamp(p[0] + d[0], 0, 1), clamp(p[1] + d[1], 0, 1)] as Point) : p)) });
    }
  };

  // Pills are offset from their lines when lines sit close, so they never cover each other.
  const pillTops = spreadLabels(LINE_ORDER.map((k) => value.lines[k]), height ? PILL_PX / height : 0.1, 0.06, 0.94);

  const polyPoints = value.roi.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');

  return (
    <div
      ref={box}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onClick={addPoint}
      className="relative aspect-video w-full cursor-crosshair touch-none select-none overflow-hidden rounded-ctl bg-slate-800"
      data-testid="calibration-canvas"
    >
      {imageUrl ? <img src={imageUrl} alt="Camera frame to calibrate" draggable={false} className="h-full w-full object-cover" /> : <RiverScene ratio={0.3} />}

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {value.roi.length >= 3 ? <polygon points={polyPoints} fill="#38BDF8" fillOpacity={0.15} stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" /> : <polyline points={polyPoints} fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
        {(Object.keys(LINE_UI) as LineKey[]).map((k) => (
          <line key={k} x1={0} x2={100} y1={value.lines[k] * 100} y2={value.lines[k] * 100} stroke={LINE_UI[k].stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {LINE_ORDER.map((k, i) => (
        <div
          key={k}
          role="slider"
          tabIndex={0}
          aria-label={`${LINE_UI[k].label} line`}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value.lines[k] * 100)}
          onPointerDown={(e) => begin(e, { kind: 'line', key: k })}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => keyLine(e, k)}
          className="group absolute right-0 z-10 flex h-11 w-28 -translate-y-1/2 cursor-ns-resize touch-none items-center justify-end rounded-l-full focus:outline-none"
          style={{ top: `${pillTops[i] * 100}%` }}
        >
          <span className={`mr-1 flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold shadow ring-1 ring-black/20 group-focus-visible:ring-2 group-focus-visible:ring-link group-focus-visible:ring-offset-2 ${LINE_UI[k].tag}`}>
            <GripHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {LINE_UI[k].label}
          </span>
        </div>
      ))}

      {value.roi.map(([x, y], i) => (
        <button
          key={i}
          type="button"
          aria-label={`Zone point ${i + 1}. Drag, use arrow keys to move, Delete to remove.`}
          onPointerDown={(e) => begin(e, { kind: 'point', index: i })}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => keyPoint(e, i)}
          className="group absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center focus:outline-none"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        >
          <span className="h-4 w-4 rounded-full border-[3px] border-action bg-surface shadow group-focus-visible:ring-2 group-focus-visible:ring-link group-focus-visible:ring-offset-2" />
        </button>
      ))}

      {value.roi.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">Tap to outline the water</p>
      )}
    </div>
  );
}

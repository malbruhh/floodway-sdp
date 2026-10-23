import React, { useEffect, useRef, useState } from 'react';

export type Snap = 'peek' | 'half' | 'full';

/** Sheet height as a share of its container, per snap. Peek is a fixed pixel height (see PEEK_PX). */
const SNAP_FRACTION: Record<Exclude<Snap, 'peek'>, number> = { half: 0.5, full: 0.92 };
const PEEK_PX = 112;
const ORDER: Snap[] = ['peek', 'half', 'full'];
const LABEL: Record<Snap, string> = { peek: 'Show more', half: 'Show all', full: 'Show less' };

interface Props {
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  /** Always visible, even when collapsed to the peek height. */
  header: React.ReactNode;
  children: React.ReactNode;
  /** Reports the current height in px so the map controls can sit above the sheet. */
  onHeight?: (px: number) => void;
}

/**
 * Phone bottom sheet with three snap heights. Drag the handle (touch, mouse or pen), tap it to step up, or use the
 * arrow keys on it. Dragging follows the finger without animation, then snaps to the nearest height, with a flick
 * going to the next one in that direction.
 */
export function BottomSheet({ snap, onSnapChange, header, children, onHeight }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragPx, setDragPx] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null);

  const containerH = () => ref.current?.parentElement?.clientHeight ?? 600;
  const heightFor = (s: Snap) => (s === 'peek' ? PEEK_PX : Math.round(containerH() * SNAP_FRACTION[s]));

  useEffect(() => {
    const el = ref.current;
    if (!el || !onHeight) return;
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight));
    ro.observe(el);
    onHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [onHeight]);

  const step = (dir: 1 | -1) => {
    const next = ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(snap) + dir))];
    if (next !== snap) onSnapChange(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const h = ref.current?.offsetHeight ?? heightFor(snap);
    drag.current = { startY: e.clientY, startH: h, lastY: e.clientY, lastT: performance.now(), v: 0, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    if (Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    d.v = (e.clientY - d.lastY) / Math.max(1, now - d.lastT); // px/ms, negative = up
    d.lastY = e.clientY;
    d.lastT = now;
    if (d.moved) setDragPx(Math.max(PEEK_PX, Math.min(heightFor('full'), d.startH + (d.startY - e.clientY))));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      step(snap === 'full' ? -1 : 1); // a tap steps up, or back down from the top
      return;
    }
    const h = dragPx ?? d.startH;
    setDragPx(null);
    if (Math.abs(d.v) > 0.5) {
      step(d.v < 0 ? 1 : -1);
      return;
    }
    const nearest = ORDER.reduce((best, s) => (Math.abs(heightFor(s) - h) < Math.abs(heightFor(best) - h) ? s : best), ORDER[0]);
    onSnapChange(nearest);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step(snap === 'full' ? -1 : 1); }
  };

  const height = dragPx ?? (snap === 'peek' ? PEEK_PX : `${SNAP_FRACTION[snap] * 100}%`);

  return (
    <section
      ref={ref}
      aria-label="Relief centres and route"
      data-snap={snap}
      className={`absolute inset-x-0 bottom-0 z-[600] flex flex-col rounded-t-sheet border-t border-line bg-surface shadow-[0_-8px_30px_rgba(15,23,42,0.18)] md:hidden ${
        dragPx === null ? 'transition-[height] duration-200 ease-out' : ''
      }`}
      style={{ height }}
    >
      <button
        type="button"
        role="slider"
        aria-label={`Sheet height. ${LABEL[snap]}`}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={ORDER.indexOf(snap)}
        aria-valuetext={snap === 'peek' ? 'collapsed' : snap === 'half' ? 'half open' : 'fully open'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="flex h-11 w-full shrink-0 touch-none cursor-grab items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-link"
      >
        <span className="h-1.5 w-11 rounded-full bg-slate-300" aria-hidden="true" />
      </button>
      <div className="shrink-0 px-3 pb-2">{header}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-rule">{children}</div>
    </section>
  );
}

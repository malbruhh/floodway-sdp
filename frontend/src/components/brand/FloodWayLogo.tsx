interface Props {
  /** Size and position come from the caller (width and height classes). */
  className?: string;
  /** A white rounded tile behind the wave, for dark backgrounds where the blue wave alone would not stand out. */
  tile?: boolean;
}

/** The FloodWay wave mark. Decorative: the product name is always written next to it. */
export function FloodWayLogo({ className = 'h-8 w-8', tile = false }: Props) {
  const mark = <img src="/logo.svg" alt="" aria-hidden="true" draggable={false} className="h-full w-full object-contain" />;
  if (!tile) return <span className={`inline-block shrink-0 ${className}`}>{mark}</span>;
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-ctl bg-surface p-1.5 shadow-lg shadow-black/25 ${className}`}>{mark}</span>;
}

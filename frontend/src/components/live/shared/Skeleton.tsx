export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-ctl bg-slate-200/80 motion-safe:animate-pulse ${className}`} aria-hidden="true" />;
}

/** Same grid as the real page, so nothing jumps when the cameras arrive. */
export function LiveVisionSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 @min-[640px]/main:mt-6 @min-[760px]/main:grid-cols-[320px_minmax(0,1fr)] @min-[760px]/main:gap-5 @min-[1260px]/main:grid-cols-[300px_minmax(520px,1fr)_340px]" aria-busy="true" aria-label="Loading cameras">
      <div className="hidden space-y-3 rounded-card border border-line bg-surface p-5 @min-[760px]/main:row-span-2 @min-[760px]/main:block @min-[1260px]/main:row-span-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[116px]" />)}
      </div>
      <div className="space-y-3 @min-[760px]/main:hidden">
        <Skeleton className="h-12" />
        <Skeleton className="h-16" />
      </div>
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="aspect-video w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-14" />
      </div>
    </div>
  );
}

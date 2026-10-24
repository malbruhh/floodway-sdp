import React, { useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { FamilySafetyBanner } from '../components/dashboard/FamilySafetyBanner';
import { CameraTiles } from '../components/home/CameraTiles';
import { ForecastTimeline } from '../components/home/ForecastTimeline';
import { GoButton } from '../components/home/GoButton';
import { NowCard } from '../components/home/NowCard';
import { RefugeCard } from '../components/home/RefugeCard';
import { RiskBar } from '../components/home/RiskBar';
import { Skeleton } from '../components/live/shared/Skeleton';
import { useApp } from '../contexts/AppContext';
import { useVisionStore } from '../hooks/vision/useVisionStore';
import { card } from '../styles/tokens';
import { highestRisk, newestReadingAt, nearestOpenShelter, overallLevel, primaryAction, whatToDo } from '../lib/home';

/** A stop on the timeline rail: a dot, a title, then the card. */
function Stop({ title, hint, first = false, delay = 0, children }: { title: string; hint?: string; first?: boolean; delay?: number; children: React.ReactNode }) {
  return (
    <section style={{ animationDelay: `${delay}ms` }} className="relative grid animate-rise gap-2 pb-[18px] pl-7 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[7px] [&:not(:last-child)]:before:top-5 [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-control">
      <span className={`absolute left-0 top-[3px] h-4 w-4 rounded-full shadow-[inset_0_0_0_3px_var(--color-ink)] ${first ? 'bg-ink' : 'bg-ground'}`} aria-hidden="true" />
      <h2 className="text-sm font-semibold">{title} {hint && <span className="font-normal text-muted">{hint}</span>}</h2>
      {children}
    </section>
  );
}

/**
 * The first screen: am I safe, and what do I do next. Risk bar, the main action, then Now -> Next 2 hours -> What to do,
 * cameras and the refuge one scroll down. Everything is computed from the vision store, the shelter list and the forecast.
 */
export function HomePage() {
  const vision = useVisionStore();
  const { shelters } = useApp();
  const loading = vision.status === 'idle' || vision.status === 'loading';
  const level = overallLevel(vision.cameras);
  const top = highestRisk(vision.cameras);
  const refuge = nearestOpenShelter(shelters);
  const urgent = primaryAction(level).kind === 'refuge';

  // The sticky "Go to refuge" shows only once the main one has scrolled out of sight.
  const mainBtn = useRef<HTMLDivElement>(null);
  const [mainVisible, setMainVisible] = useState(true);
  useEffect(() => {
    const el = mainBtn.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setMainVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  return (
    <AppShell>
      <main className="mx-auto grid w-full max-w-[720px] content-start gap-3 p-4 pb-8 lg:max-w-5xl" aria-label="Home">
        <FamilySafetyBanner />
        <RiskBar loading={loading} level={level} camera={top} updatedAt={newestReadingAt(vision.cameras)} />
        <div ref={mainBtn}><GoButton level={level} refugeId={refuge?.id} /></div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-6">
          <div className="mt-1 grid">
            <Stop title="Now" first>
              {loading ? <Skeleton className="h-64 w-full rounded-card" /> : <NowCard camera={top} useScene={vision.usingMock} />}
            </Stop>
            <Stop title="Next 2 hours" hint="a simulated estimate" delay={80}>
              <ForecastTimeline />
            </Stop>
            <Stop title="What to do" delay={160}>
              <div className={`${card} p-4`}>
                <ol className="grid list-decimal gap-1.5 pl-5 text-[15px] marker:font-semibold marker:text-muted">
                  {whatToDo(level).map((s) => <li key={s}>{s}</li>)}
                </ol>
                <p className="mt-3 text-xs text-muted">General guidance, not an official advisory.</p>
              </div>
            </Stop>
          </div>
          <div className="grid gap-3">
            <RefugeCard />
            <CameraTiles loading={loading} cameras={vision.cameras} useScene={vision.usingMock} />
          </div>
        </div>
      </main>

      {urgent && !mainVisible && (
        <div className="fixed inset-x-0 bottom-[var(--nav-h)] z-[550] bg-ground px-4 py-2.5 shadow-[0_-1px_0_var(--color-line)] md:hidden">
          <GoButton level={level} refugeId={refuge?.id} className="min-h-[52px] py-1.5" />
        </div>
      )}
    </AppShell>
  );
}

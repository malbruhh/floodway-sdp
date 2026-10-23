import React from 'react';
import { AppShell } from '../components/layout/AppShell';
import { FamilySafetyBanner } from '../components/dashboard/FamilySafetyBanner';
import { SystemStatusStrip } from '../components/dashboard/SystemStatusStrip';
import { CameraStatusRow } from '../components/home/CameraStatusRow';
import { DistrictRiskBars } from '../components/home/DistrictRiskBars';
import { ForecastTimeline } from '../components/home/ForecastTimeline';
import { HeroStatus } from '../components/home/HeroStatus';
import { HomeMap } from '../components/home/HomeMap';
import { RefugeAction } from '../components/home/RefugeAction';
import { ReportsSummary } from '../components/home/ReportsSummary';
import { RiverTrend } from '../components/home/RiverTrend';
import { useVisionStore } from '../hooks/vision/useVisionStore';
import { allSampleCameras, cameraCounts, highestRisk, newestReadingAt, overallLevel } from '../lib/home';

/**
 * The first screen. One overall level, one primary action, then the evidence behind it. Everything here is computed from
 * data (sample cameras, the shelter list, the forecast endpoint) or labelled simulated; see config/demoScenario.ts.
 */
export function HomePage() {
  const vision = useVisionStore();
  const loading = vision.status === 'idle' || vision.status === 'loading';
  const sample = vision.usingMock || (vision.cameras.length > 0 && allSampleCameras(vision.cameras));

  return (
    <AppShell>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4 md:space-y-6 md:p-6 lg:p-8" aria-label="Home">
          <FamilySafetyBanner />

          <HeroStatus
            loading={loading}
            level={overallLevel(vision.cameras)}
            topCamera={highestRisk(vision.cameras)}
            updatedAt={newestReadingAt(vision.cameras)}
            sample={sample}
            counts={cameraCounts(vision.cameras)}
          />

          {/* On phones: action first, then cameras, then the map. On desktop: action beside the map. */}
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5"><RefugeAction /></div>
            <div className="lg:col-span-7 lg:row-span-2 lg:row-start-1 lg:col-start-6"><HomeMap /></div>
            <div className="min-w-0 lg:col-span-5"><CameraStatusRow loading={loading} cameras={vision.cameras} useScene={vision.usingMock} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7"><RiverTrend loading={loading} cameras={vision.cameras} history={vision.history} /></div>
            <div className="lg:col-span-5"><DistrictRiskBars loading={loading} cameras={vision.cameras} /></div>
          </div>

          <ForecastTimeline />

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5"><ReportsSummary /></div>
            <div className="lg:col-span-7 lg:self-center"><SystemStatusStrip /></div>
          </div>
        </main>

        </AppShell>
  );
}

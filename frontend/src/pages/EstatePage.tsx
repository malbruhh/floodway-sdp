import React, { useEffect, useMemo, useState } from 'react';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { AreaOverview } from '../components/estate/AreaOverview';
import { BuildingRiskPanel } from '../components/estate/BuildingRiskPanel';
import { OpenReportsCard } from '../components/estate/OpenReportsCard';
import { useApp } from '../contexts/AppContext';
import { useVisionStore } from '../hooks/vision/useVisionStore';
import { alertsFor, areaLevel, camerasIn, loadBuilding, reportsFor, saveBuilding } from '../lib/estate';
import { allSampleCameras, scenarioFromLevel } from '../lib/home';
import { DEFAULT_TOWNSHIP_ID, TOWNSHIPS, townshipById, townshipContents } from '../lib/townships';
import { interactive, label, pageTitle } from '../styles/tokens';

/** For the person who manages buildings in one township: water level, alerts, open reports and a building risk estimate. */
export function EstatePage() {
  const [townshipId, setTownshipId] = useState(DEFAULT_TOWNSHIP_ID);
  const [building, setBuilding] = useState(loadBuilding);
  useEffect(() => saveBuilding(building), [building]);

  const { cameras, alerts } = useVisionStore();
  const { reports } = useApp();

  const township = townshipById(townshipId);
  const areaCams = useMemo(() => camerasIn(township, cameras), [township, cameras]);
  const ids = useMemo(() => new Set(areaCams.map((c) => c.id)), [areaCams]);
  const level = areaLevel(areaCams);
  const areaAlerts = useMemo(() => alertsFor(alerts, ids), [alerts, ids]);
  const rep = useMemo(() => reportsFor(reports, township), [reports, township]);
  const origins = useMemo(() => townshipContents(township, [], []).origins, [township]);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <Header />
        <main className="@container/main mx-auto w-full max-w-7xl flex-1 space-y-4 p-4 md:space-y-6 md:p-6 lg:p-8" aria-label="Estate">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className={pageTitle}>Estate</h1>
              <p className="text-sm/5 text-slate-700">Water, alerts, reports and building risk for one township.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className={label}>
                Township
                <select
                  value={townshipId}
                  onChange={(e) => setTownshipId(e.target.value)}
                  className={`mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 ${interactive}`}
                >
                  {TOWNSHIPS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            </div>
          </div>

          {areaCams.length > 0 && allSampleCameras(areaCams) && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm/5 font-medium text-amber-900">
              Simulated: the cameras here are AI-generated sample scenes, so the levels and alerts show how the system works, not what is happening on a real river.
            </p>
          )}

          <AreaOverview level={level} cameras={areaCams} alerts={areaAlerts} />

          <div className="grid gap-4 md:gap-6 @min-[760px]/main:grid-cols-[3fr_2fr] @min-[760px]/main:items-start">
            <BuildingRiskPanel origins={origins} building={building} onChange={setBuilding} scenario={scenarioFromLevel(level)} areaLevel={level} />
            <OpenReportsCard open={rep.open} published={rep.published} />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

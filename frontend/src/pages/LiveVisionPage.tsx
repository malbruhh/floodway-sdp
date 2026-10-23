import { ChevronDown, Search, SlidersHorizontal, Video } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AlertToast } from '../components/live/alerts/AlertToast';
import { RecentAlerts } from '../components/live/alerts/RecentAlerts';
import { AnalysisColumn } from '../components/live/analysis/AnalysisColumn';
import { CameraDetailsCard } from '../components/live/analysis/CameraDetailsCard';
import { RouteAction } from '../components/live/analysis/RouteAction';
import { CameraChips } from '../components/live/cameras/CameraChips';
import { CameraList } from '../components/live/cameras/CameraList';
import { NearbyFilters } from '../components/live/cameras/NearbyFilters';
import { CameraGrid } from '../components/live/feed/CameraGrid';
import { CameraStrip } from '../components/live/feed/CameraStrip';
import { CaptureStrip } from '../components/live/feed/CaptureStrip';
import { FeedHeader } from '../components/live/feed/FeedHeader';
import { FeedViewer } from '../components/live/feed/FeedViewer';
import { DEFAULT_OVERLAYS, OverlayToggles } from '../components/live/feed/OverlayToggles';
import type { OverlayState } from '../components/live/feed/OverlayToggles';
import { ViewToggle } from '../components/live/feed/ViewToggle';
import type { ViewMode } from '../components/live/feed/ViewToggle';
import { WeatherPanel } from '../components/weather/WeatherPanel';
import { JpsCameraWall } from '../components/live/jps/JpsCameraWall';
import { AddCameraWizard } from '../components/live/onboarding/AddCameraWizard';
import { ConnectionChip, OfflineNotice } from '../components/live/shared/ConnectionStatus';
import { EmptyState } from '../components/live/shared/EmptyState';
import { LiveVisionSkeleton } from '../components/live/shared/Skeleton';
import { card, cardTitle, interactive, pageTitle } from '../components/live/shared/ui';
import { useAlertEffects } from '../hooks/vision/useAlertEffects';
import { useGpsPlace } from '../hooks/vision/useGpsPlace';
import { useNearbyCameras } from '../hooks/vision/useNearbyCameras';
import type { CameraTab } from '../hooks/vision/useNearbyCameras';
import { useSelectedCamera } from '../hooks/vision/useSelectedCamera';
import { useVisionStore, visionActions } from '../hooks/vision/useVisionStore';
import { camTag } from '../lib/vision/camTag';
import { haversineKm, KLCC, PLACES } from '../lib/vision/geo';
import { FORCE_MOCK } from '../services/vision/config';
import type { AlertEvent } from '../types/vision';

// The 3-column layout needs ~1260px of content; on laptops the full sidebar would take that away.
const COMPACT_SIDEBAR_BELOW = 1536;
const TAB_LABEL: Record<CameraTab, string> = { nearby: 'Nearby', city: 'City', mine: 'My cameras' };

/** Live Vision: replaces the old 3D simulation page. Route: /live */
export default function LiveVisionPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const source = params.get('source') === 'jps' ? 'jps' : 'ai';
  const state = useVisionStore();
  const gps = useGpsPlace();

  const places = useMemo(() => (gps ? [gps, ...PLACES] : PLACES), [gps]);
  const [placeId, setPlaceId] = useState(KLCC.id);
  const origin = places.find((p) => p.id === placeId) ?? KLCC;
  const [radiusKm, setRadiusKm] = useState(5);
  const [tab, setTab] = useState<CameraTab>('nearby');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('focus');
  const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAYS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [compactSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth < COMPACT_SIDEBAR_BELOW);

  const items = useNearbyCameras(state.cameras, { origin, radiusKm, tab, query });
  const visible = useMemo(() => items.map((i) => i.camera), [items]);
  const { selected, selectedId, setSelectedId } = useSelectedCamera(visible);
  const selectedDistance = selected ? haversineKm(origin.lat, origin.lon, selected.lat, selected.lon) : 0;
  const selectedLevel = selected?.online ? selected.reading?.level : undefined;

  useAlertEffects(state.unseen);
  // Every card shows a sparkline, so fetch each camera's recent readings once (no-op if already loaded).
  const cameraIds = state.cameras.map((c) => c.id).join(',');
  useEffect(() => {
    if (state.status !== 'ready' || state.usingMock) return;
    cameraIds.split(',').filter(Boolean).forEach((id) => void visionActions.loadHistory(id));
  }, [state.status, state.usingMock, cameraIds]);

  const showOnMap = useCallback((cameraId: string) => navigate(`/map?focus=${encodeURIComponent(cameraId)}`), [navigate]);
  const openAlert = useCallback((a: AlertEvent) => { visionActions.ackAlert(a.id); showOnMap(a.camera_id); }, [showOnMap]);
  const dismissAlert = useCallback((a: AlertEvent) => visionActions.ackAlert(a.id), []);
  const openWizard = useCallback(() => setWizardOpen(true), []);

  const onlineCount = state.cameras.filter((c) => c.online).length;
  const loading = state.status === 'idle' || state.status === 'loading';
  const filters = <NearbyFilters places={places} placeId={placeId} onPlace={setPlaceId} radiusKm={radiusKm} onRadius={setRadiusKm} tab={tab} onTab={setTab} query={query} onQuery={setQuery} />;
  const searching = query.trim().length > 0;
  const emptyList = searching ? (
    <EmptyState icon={Search} title={`No cameras match "${query.trim()}"`} hint="Check the spelling or clear the search." action={{ label: 'Clear search', onClick: () => setQuery('') }} />
  ) : (
    <EmptyState
      icon={Video}
      title={tab === 'mine' ? 'No cameras of your own yet' : 'No cameras in this radius'}
      hint={tab === 'mine' ? 'Add a stream or snapshot URL, draw the water zone, and the AI starts watching it.' : 'Try a larger radius or the City tab.'}
      action={tab === 'mine' ? { label: 'Add your first camera', onClick: openWizard } : undefined}
    />
  );

  return (
    <>
    <AppShell compactSidebar={compactSidebar}>
        <main className="@container/main flex-1" aria-label="Live Vision">
          <div className="mx-auto w-full max-w-[1600px] p-4 @min-[640px]/main:p-6 @min-[1280px]/main:p-8">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h1 className={`${pageTitle} flex items-center gap-2`}>
                  <Video className="h-5 w-5 shrink-0 text-[#1677FF] @min-[640px]/main:h-6 @min-[640px]/main:w-6" aria-hidden="true" />
                  Live Vision
                </h1>
                <p className="mt-0.5 hidden text-sm/5 text-slate-600 @min-[640px]/main:block">AI reads the water level from nearby river cameras every few seconds.</p>
              </div>
              {source === 'ai' && !loading && <ConnectionChip usingMock={state.usingMock} connected={state.connected} online={onlineCount} total={state.cameras.length} />}
            </div>
            <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Camera source">
              {([['ai', 'Live Vision (AI)'], ['jps', 'JPS Selangor snapshots']] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={source === id} onClick={() => setParams(id === 'jps' ? { source: 'jps' } : {}, { replace: true })} className={`min-h-11 rounded-lg px-3 text-sm/5 font-semibold @min-[760px]/main:min-h-9 ${interactive} ${source === id ? 'bg-[#0958D9] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{label}</button>
              ))}
            </div>
            {source === 'ai' && !loading && state.usingMock && <div className="mt-3"><OfflineNotice forcedMock={FORCE_MOCK} error={state.error} /></div>}

            {source === 'jps' ? (
              <JpsCameraWall />
            ) : loading ? (
              <LiveVisionSkeleton />
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 @min-[640px]/main:mt-6 @min-[760px]/main:grid-cols-[320px_minmax(0,1fr)] @min-[760px]/main:gap-5 @min-[1260px]/main:grid-cols-[300px_minmax(520px,1fr)_340px]">
                {/* LEFT: cameras near you (2- and 3-column layouts). A sticky panel whose list scrolls on its own,
                    so a long list never stretches the page under the feed. */}
                <aside className={`${card} sticky top-6 hidden max-h-[calc(100dvh-8rem)] min-h-0 flex-col self-start @min-[760px]/main:row-span-3 @min-[760px]/main:flex @min-[1260px]/main:row-span-2`} aria-labelledby="cams-title">
                  <div className="border-b border-slate-100 p-5 pb-4">
                    <h2 id="cams-title" className={`${cardTitle} mb-4`}>Cameras near you</h2>
                    {filters}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
                    <CameraList items={items} history={state.history} selectedId={selectedId} useScene={state.usingMock} empty={emptyList} onSelect={setSelectedId} onAdd={openWizard} />
                  </div>
                </aside>

                {/* PHONE: filter summary + camera chips */}
                <div className="min-w-0 space-y-3 @min-[760px]/main:hidden">
                  <button type="button" aria-expanded={filtersOpen} aria-controls="phone-filters" onClick={() => setFiltersOpen(!filtersOpen)} className={`${card} flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-semibold text-slate-900 ${interactive}`}>
                    <span className="flex min-w-0 items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                      <span className="truncate">{origin.label.split(',')[0]} · {radiusKm} km · {TAB_LABEL[tab]}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 motion-reduce:transition-none ${filtersOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {filtersOpen && <div id="phone-filters" className={`${card} p-4`}>{filters}</div>}
                  {items.length > 0 ? <CameraChips items={items} selectedId={selectedId} onSelect={setSelectedId} onAdd={openWizard} /> : emptyList}
                </div>

                {/* CENTRE: the feed */}
                <section className="min-w-0 space-y-4 @min-[760px]/main:col-start-2" aria-label="Camera feed">
                  {selected ? (
                    <>
                      <div className="@container/toolbar flex items-center justify-between gap-3">
                        <ViewToggle value={view} onChange={setView} />
                        {view === 'focus' && selected.online && <OverlayToggles value={overlays} onChange={setOverlays} />}
                      </div>
                      {view === 'focus' ? (
                        <>
                          <FeedHeader camera={selected} distanceKm={selectedDistance} />
                          <WeatherPanel lat={selected.lat} lon={selected.lon} name={selected.name} />
                          <div className={`${card} p-2`}>
                            <FeedViewer camera={selected} tag={camTag(state.cameras, selected.id)} useScene={state.usingMock} overlays={overlays} onRetry={() => void visionActions.analyzeNow(selected.id).catch(() => undefined)} />
                          </div>
                          <CaptureStrip camera={selected} />
                          <div className="hidden @min-[760px]/main:block">
                            <CameraStrip cameras={visible} allCameras={state.cameras} selectedId={selectedId} useScene={state.usingMock} onSelect={setSelectedId} />
                          </div>
                        </>
                      ) : (
                        <CameraGrid cameras={visible} allCameras={state.cameras} useScene={state.usingMock} overlays={overlays} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setView('focus'); }} />
                      )}
                    </>
                  ) : (
                    items.length > 0 && <EmptyState icon={Video} title="Select a camera" hint="Pick a camera from the list to see its live analysis." />
                  )}
                </section>

                {/* RIGHT: analysis (beside the feed when wide, under it otherwise) */}
                {selected && (
                  <aside className="@container/analysis min-w-0 @min-[1260px]/main:col-start-3 @min-[1260px]/main:row-span-2 @min-[1260px]/main:row-start-1" aria-label="AI analysis">
                    <AnalysisColumn
                      camera={selected}
                      history={state.history[selected.id] ?? []}
                      action={<div className="hidden @min-[760px]/main:block"><RouteAction level={selectedLevel} onClick={() => showOnMap(selected.id)} /></div>}
                    />
                  </aside>
                )}

                {/* Camera details and the alert log: under the feed on wide layouts, last on phones. */}
                {selected && (
                  <div className="@container/extras min-w-0 @min-[760px]/main:col-start-2">
                    <div className="grid items-start gap-4 @min-[640px]/extras:grid-cols-2">
                      <CameraDetailsCard camera={selected} distanceKm={selectedDistance} onRemove={async () => { await visionActions.removeCamera(selected.id); }} />
                      <RecentAlerts alerts={state.alerts} />
                    </div>
                  </div>
                )}

                {/* PHONE: the one action stays in reach, above the bottom nav */}
                {selected && (
                  <div className="sticky bottom-3 z-20 @min-[760px]/main:hidden">
                    <RouteAction level={selectedLevel} onClick={() => showOnMap(selected.id)} className="shadow-lg shadow-slate-900/15" />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        </AppShell>
      <AlertToast alert={state.unseen[0]} onOpen={openAlert} onDismiss={dismissAlert} />
      <AddCameraWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onSaved={(id) => { setTab('mine'); setSelectedId(id); }} origin={origin} offlineDemo={state.usingMock} gpsAvailable={Boolean(gps)} />
    </>
  );
}

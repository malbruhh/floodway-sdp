import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { dispatchArrivalCheckin, type TelegramResult } from '../../services/telegramService';
import { InPageActionDock } from './InPageActionDock';
import { VisionHazardLayer } from './VisionHazardLayer';
import { JpsCameraLayer } from './JpsCameraLayer';
import { MapLegend } from './MapLegend';
import { FloodProneLayer, SCENARIO_COLOR, floodedZones, type Scenario } from './FloodProneLayer';
import { BottomSheet, type Snap } from './BottomSheet';
import { MapPanel, type ShelterFilter } from './MapPanel';
import { NavigationHud } from './NavigationHud';
import { ArrivalDialog } from './ArrivalDialog';
import { createShelterIcon, gpsNavIcon, userIcon } from './mapIcons';
import { BASEMAP_ATTRIBUTION, BASEMAP_MAX_ZOOM, BASEMAP_URL } from '../../config/mapConfig';
import { ORIGINS, originForLocation } from '../../data/klDemo';
import { formatCapacity, formatMin } from '../../lib/format';
import type { TravelMode } from '../../lib/mappers';
import { etaMin, lineLengthM, pointAtDistance, rankRoutes, stepAt, toRoadRoute, type LatLon, type RoadRoute, type ScoredRoute, type Zone } from '../../lib/routing';
import { allSampleCameras, overallLevel, scenarioFromLevel } from '../../lib/home';
import { useVisionStore } from '../../hooks/vision/useVisionStore';
import { useVisionHazards } from '../../hooks/vision/useVisionHazards';
import { useDriveSim } from '../../hooks/useDriveSim';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DEFAULT_TOWNSHIP_ID, townshipById } from '../../lib/townships';

type RoutesDb = Record<string, Parameters<typeof toRoadRoute>[0][]>;

/** Length of the simulated drive on screen, whatever the real route length. */
const DRIVE_MS = 30000;
const KL_CENTER: LatLon = [3.155, 101.69];

/** Moves the map to the chosen township. */
function FlyToTownship({ center, zoom }: { center: LatLon; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 0.8 }); }, [center, zoom, map]);
  return null;
}

/** Fits the chosen route in the visible part of the map (the phone sheet covers the bottom). */
function FitRoute({ line, bottomPad, enabled }: { line: LatLon[] | null; bottomPad: number; enabled: boolean }) {
  const map = useMap();
  const key = line ? `${line[0]}|${line[line.length - 1]}|${line.length}` : '';
  useEffect(() => {
    if (!line || !enabled) return;
    map.fitBounds(L.latLngBounds(line), { paddingTopLeft: [32, 72], paddingBottomRight: [32, bottomPad + 24], maxZoom: 16, animate: true });
    // refit when the route changes or the sheet height settles, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, bottomPad, enabled, map]);
  return null;
}

/** Follows the simulated car. */
function FollowCar({ pos, active }: { pos: LatLon | null; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active && pos) map.setView(pos, 16, { animate: true, duration: 0.25 });
  }, [pos, active, map]);
  return null;
}

export function ShelterMapView() {
  const navigate = useNavigate();
  const { shelters, selectedLocation, setSelectedLocation, setFamilySafetyStatus } = useApp();
  const { user } = useAuth();

  const desktop = useMediaQuery('(min-width: 768px)');
  const origin = originForLocation(selectedLocation);
  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get('to') ?? 'shelter-01');
  // The flood areas follow the cameras unless the user picks a scenario by hand.
  const { cameras } = useVisionStore();
  const township = townshipById(DEFAULT_TOWNSHIP_ID);
  const auto = scenarioFromLevel(overallLevel(cameras));
  const [override, setOverride] = useState<Scenario | null>(null);
  const scenario = override ?? auto;
  const [filter, setFilter] = useState<ShelterFilter>('all');
  const [mode, setMode] = useState<TravelMode>('car');
  const [chosen, setChosen] = useState(0);
  const [snap, setSnap] = useState<Snap>('peek');
  const [sheetH, setSheetH] = useState(0);
  const [routesDb, setRoutesDb] = useState<RoutesDb | null>(null);
  const [arrival, setArrival] = useState<{ when: string; telegram: TelegramResult | null } | null>(null);

  // The road routes are a 170 kB data file: load it after the first paint.
  useEffect(() => {
    let live = true;
    import('../../data/klRoutes.json').then((m) => live && setRoutesDb((m.default as unknown as { routes: RoutesDb }).routes));
    return () => {
      live = false;
    };
  }, []);

  const selected = shelters.find((s) => s.id === selectedId) ?? shelters[0];

  // Zones routes must avoid: the flooded demo areas for this scenario plus any sample-camera zones at WARNING/DANGER.
  const cameraHazards = useVisionHazards();
  const zones = useMemo<Zone[]>(
    () => [...floodedZones(scenario), ...cameraHazards.map((h) => ({ id: `cam-${h.cameraId}`, lat: h.lat, lon: h.lon, radiusM: h.radiusM }))],
    [scenario, cameraHazards],
  );

  const rankedFor = useCallback(
    (shelterId: string): ScoredRoute[] => {
      const raw = routesDb?.[`${origin.id}|${shelterId}`];
      return raw ? rankRoutes(raw.map(toRoadRoute), zones) : [];
    },
    [routesDb, origin.id, zones],
  );
  const alternatives = useMemo(() => (selected ? rankedFor(selected.id) : []), [rankedFor, selected]);
  const best = useMemo(() => Object.fromEntries(shelters.map((s) => [s.id, rankedFor(s.id)[0] ?? null])), [shelters, rankedFor]);

  // A different centre, start point or scenario starts again from the suggested route.
  const route: ScoredRoute | null = alternatives[Math.min(chosen, alternatives.length - 1)] ?? null;

  // Simulated drive along the chosen road route.
  const lineLen = useMemo(() => (route ? lineLengthM(route.line) : 0), [route]);
  const speedup = route ? route.durationS / (DRIVE_MS / 1000) : 1;
  const onArrive = useCallback(() => {
    if (!route || !selected) return;
    const now = new Date();
    const date = now.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setFamilySafetyStatus('ARRIVED_SAFE');
    setArrival({ when: `${date} · ${time}`, telegram: null });
    dispatchArrivalCheckin({ userName: user?.name || 'Demo user', shelterName: selected.name, dateStr: date, timeStr: time })
      .then((telegram) => setArrival((a) => (a ? { ...a, telegram } : a)))
      .catch(() => setArrival((a) => (a ? { ...a, telegram: { success: false } } : a)));
  }, [route, selected, setFamilySafetyStatus, user?.name]);
  const sim = useDriveSim(DRIVE_MS, onArrive);
  // A camera level change must not reset the route in the middle of a simulated drive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!sim.active) setChosen(0); }, [selectedId, origin.id, scenario]);

  const travelled = route ? sim.progress * route.distanceM : 0;
  const car = useMemo(() => (route && sim.active ? pointAtDistance(route.line, sim.progress * lineLen).pos : null), [route, sim.active, sim.progress, lineLen]);
  const step = route && sim.active ? stepAt(route, travelled) : null;
  const nextText = step ? (step.next ? `${step.next.text}` : 'Arrive at the relief centre') : '';

  const start = () => {
    if (!route || !selected || selected.status === 'FULL' || selected.status === 'CLOSED') return;
    setSnap('peek'); // on a phone the sheet must get out of the way, so the map with the route is what you see
    setArrival(null);
    sim.start();
  };
  const cancel = () => sim.stop();

  const panel = (
    <MapPanel
      originId={origin.id}
      onOrigin={(id) => {
        sim.stop();
        const o = ORIGINS.find((x) => x.id === id);
        if (o) setSelectedLocation(o.location);
      }}
      scenario={scenario}
      onScenario={(s) => {
        sim.stop();
        setOverride(s);
      }}
      auto={override === null}
      onAuto={() => setOverride(null)}
      autoNote={allSampleCameras(cameras) ? 'Flood areas follow the highest camera level (sample cameras)' : 'Flood areas follow the highest camera level'}
      floodedCount={floodedZones(scenario).length}
      cameraZoneCount={cameraHazards.length}
      shelters={shelters}
      best={best}
      selectedId={selected?.id ?? ''}
      onSelect={(id) => {
        sim.stop();
        setSelectedId(id);
      }}
      filter={filter}
      onFilter={setFilter}
      mode={mode}
      onMode={setMode}
      alternatives={alternatives}
      chosen={Math.min(chosen, Math.max(0, alternatives.length - 1))}
      onChoose={(i) => {
        sim.stop();
        setChosen(i);
      }}
      navigating={sim.active}
      onStart={start}
      routesReady={routesDb !== null}
    />
  );

  const peekHeader = selected && (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{selected.name.replace('Demo relief centre: ', '')}</p>
        <p className="truncate text-xs text-muted">
          {route ? (
            <>
              {(route.distanceM / 1000).toFixed(1)} km · ~{formatMin(etaMin(route, mode))} ·{' '}
              <span className={route.crossings === 0 ? 'font-bold text-normal' : 'font-bold text-danger'}>
                {route.crossings === 0 ? 'avoids flooded areas' : `passes through ${route.crossings} flooded ${route.crossings === 1 ? 'area' : 'areas'}`}
              </span>
            </>
          ) : routesDb ? (
            'No stored road route'
          ) : (
            'Loading routes…'
          )}
        </p>
      </div>
      {sim.active ? (
        <button type="button" onClick={cancel} className="min-h-11 shrink-0 rounded-ctl bg-danger px-3.5 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={!route || selected.status === 'FULL' || selected.status === 'CLOSED'}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-ctl bg-action px-3.5 text-xs font-bold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" /> Start route
        </button>
      )}
    </div>
  );

  return (
    <div className="relative flex h-[calc(100dvh-8rem)] w-full flex-col overflow-hidden bg-raised md:h-[calc(100vh-64px)] md:flex-row">
      <div className="relative min-h-[350px] flex-1">
        <InPageActionDock />
        <MapContainer center={KL_CENTER} zoom={12} scrollWheelZoom preferCanvas className="z-0 h-full w-full">
          <TileLayer attribution={BASEMAP_ATTRIBUTION} url={BASEMAP_URL} maxZoom={BASEMAP_MAX_ZOOM} />
          <FlyToTownship center={township.center} zoom={township.zoom} />
          <VisionHazardLayer />
          <JpsCameraLayer />
          <FloodProneLayer scenario={scenario} />
          <FitRoute line={route?.line ?? null} bottomPad={desktop ? 0 : sheetH} enabled={!sim.active} />
          <FollowCar pos={car} active={sim.active} />

          {/* Other routes first (dashed, tap to choose), then the chosen one on top with a white casing */}
          {alternatives.map((r, i) =>
            i === chosen ? null : (
              <Polyline
                key={`alt-${r.index}`}
                positions={r.line}
                pathOptions={{ color: '#64748B', weight: 5, opacity: 0.8, dashArray: '8 8' }}
                eventHandlers={{ click: () => !sim.active && setChosen(i) }}
              />
            ),
          )}
          {route && (
            <>
              <Polyline positions={route.line} pathOptions={{ color: '#FFFFFF', weight: 10, opacity: 0.9 }} />
              <Polyline positions={route.line} pathOptions={{ color: '#1d5fbf', weight: 6, opacity: 0.95 }} />
            </>
          )}

          {car ? (
            <Marker position={car} icon={gpsNavIcon} />
          ) : (
            <Marker position={[origin.lat, origin.lon]} icon={userIcon}>
              <Popup>
                <span className="text-xs font-semibold">Your position (demo): {origin.label}</span>
              </Popup>
            </Marker>
          )}

          {shelters.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lon]}
              icon={createShelterIcon(s.id === selected?.id, s.status)}
              eventHandlers={{ click: () => !sim.active && setSelectedId(s.id) }}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <b className="block text-ink">{s.name}</b>
                  <span className="block font-semibold text-muted">
                    {s.status} · {formatCapacity(s.currentCapacity, s.maxCapacity)}
                  </span>
                  <span className="block text-muted">{s.address}</span>
                  <span className="mt-1 block font-semibold text-muted">Demo relief centre, not an official register.</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {sim.active && step && route && (
          <NavigationHud
            instruction={nextText}
            toNextM={step.toNextM}
            remainingM={Math.max(0, route.distanceM - travelled)}
            remainingMin={Math.max(0, etaMin(route, mode) * (1 - sim.progress))}
            progress={sim.progress}
            speedup={speedup}
            onCancel={cancel}
          />
        )}

        {arrival && selected && (
          <ArrivalDialog
            shelterName={selected.name.replace('Demo relief centre: ', '')}
            capacity={formatCapacity(selected.currentCapacity, selected.maxCapacity)}
            when={arrival.when}
            telegram={arrival.telegram}
            onClose={() => setArrival(null)}
            onReports={() => navigate('/reports')}
          />
        )}

        {(desktop || snap !== 'full') && <MapLegend floodColor={SCENARIO_COLOR[scenario]} bottomOffset={desktop ? 0 : sheetH} />}

        {/* Phones: three-height bottom sheet over the map. Desktop uses the side panel below. */}
        {!desktop && (
          <BottomSheet snap={snap} onSnapChange={setSnap} header={peekHeader} onHeight={setSheetH}>
            {panel}
          </BottomSheet>
        )}
      </div>

      {desktop && (
        <aside aria-label="Route planner" className="z-20 h-full w-[410px] shrink-0 overflow-y-auto border-l border-line bg-surface shadow-2xl lg:w-[450px]">
          {panel}
        </aside>
      )}
    </div>
  );
}

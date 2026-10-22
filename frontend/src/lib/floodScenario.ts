// Pure flood-scenario rules shared by the map layer and the Estate page (kept free of Leaflet so tests can import it).
import { DANGER_RADIUS_SCALE, type FloodProneArea } from '../data/klDemo';

export type Scenario = 'normal' | 'warning' | 'danger';
const WATCH_SCALE = 0.55;

/** Whether the area is flooded in this scenario, or only on watch (low-lying but dry). */
export function stateOf(area: FloodProneArea, scenario: Scenario): 'flooded' | 'watch' {
  if (scenario === 'danger') return 'flooded';
  if (scenario === 'warning' && area.onset === 'warning') return 'flooded';
  return 'watch';
}

export function radiusOf(area: FloodProneArea, scenario: Scenario): number {
  if (stateOf(area, scenario) === 'watch') return area.radiusM * WATCH_SCALE;
  return area.radiusM * (scenario === 'danger' ? DANGER_RADIUS_SCALE : 1);
}

import { ChevronDown, Map as MapIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { isAlertLevel } from '../../../lib/vision/levels';
import type { Camera, Reading } from '../../../types/vision';
import { card, cardTitle, interactive } from '../shared/ui';
import { JsonOutputCard } from './JsonOutputCard';
import { LevelHistoryChart } from './LevelHistoryChart';
import { WaterLevelCard } from './WaterLevelCard';

interface Props {
  camera: Camera;
  history: Reading[];
  action: ReactNode;
}

/** The reading for the selected camera. Right column on wide layouts; under the feed (2-up when there is room)
 *  otherwise. Must sit inside an `@container/analysis`. */
export function AnalysisColumn({ camera, history, action }: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const reading = camera.reading;
  const level = camera.online ? reading?.level : undefined;
  const alerting = level ? isAlertLevel(level) : false;

  return (
    <div className="grid items-start gap-4 @min-[640px]/analysis:grid-cols-2">
      <div className="space-y-3">
        <WaterLevelCard camera={camera} history={history} />
        {alerting && (
          <p className="flex items-start gap-2 rounded-ctl border border-transparent bg-warning-bg px-3 py-2 text-sm/5 font-medium text-warning">
            <MapIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            This camera adds a flood zone that evacuation routes avoid.
          </p>
        )}
        {action}
      </div>

      {reading && camera.online && (
        <section className={card}>
          <button type="button" onClick={() => setAiOpen(!aiOpen)} aria-expanded={aiOpen} aria-controls="ai-output" className={`flex min-h-14 w-full items-center justify-between rounded-card px-4 text-left @min-[760px]/main:px-5 ${interactive}`}>
            <span className={cardTitle}>For developers: raw AI output</span>
            <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-200 motion-reduce:transition-none ${aiOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {aiOpen && (
            <div id="ai-output" className="space-y-4 border-t border-rule p-4 @min-[760px]/main:p-5">
              <LevelHistoryChart history={history} calibration={camera.calibration} />
              <JsonOutputCard reading={reading} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

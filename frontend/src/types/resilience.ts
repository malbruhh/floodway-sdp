// Mirrors GET /api/v1/resilience/summary, so snake_case on purpose (same convention as types/vision.ts).

export interface Episode {
  camera_id: string;
  camera_name: string;
  started_at: string;
  early_signal_at: string;
  warning_at: string | null;
  danger_at: string | null;
  ended_at: string | null;
  /** Seconds from the early signal to the first DANGER alert; null when the episode never had one. */
  lead_time_s: number | null;
  /** The server restarted while this episode was open, so it was never closed by an all-clear. */
  interrupted: boolean;
  simulated: boolean;
}

export interface ResilienceSummary {
  window_h: number;
  generated_at: string;
  log_since: string | null;
  all_simulated: boolean;
  episodes: Episode[];
  episodes_caught: number;
  episodes_ongoing: number;
  lead: { count: number; none_count: number; median_s: number | null; min_s: number | null; max_s: number | null };
  alerts: { raised: number; all_clear: number; sent_external: number; failed: number; suppressed: number };
  routes: { started: number; arrived: number };
}

export type CsvKind = 'episodes' | 'alerts' | 'routes';

// Contracts for Live Vision. Field names are snake_case on purpose: they mirror the backend JSON exactly,
// so there is no mapping layer to get wrong.

export type Level = 'NORMAL' | 'ADVISORY' | 'WARNING' | 'DANGER';
export type Provider = 'public' | 'city' | 'mine';
export type SourceType = 'snapshot' | 'stream' | 'synthetic' | 'file' | 'upload';
export type Trend = 'rising' | 'steady' | 'falling';

export type Point = [number, number]; // normalised 0..1, (x, y), y = 0 is the top of the frame

export interface Lines {
  normal: number;
  warning: number;
  danger: number; // danger < warning < normal (smaller y = higher water)
}

export interface Calibration {
  roi: Point[];
  lines: Lines;
}

export interface Reading {
  camera_id: string;
  timestamp: string;
  window_seconds: number;
  frames_analyzed: number;
  water_ratio: number;
  waterline_y: number | null;
  level: Level;
  observed_level: Level;
  confidence: number;
  low_confidence: boolean;
  lines_crossed: string[];
  trend: Trend;
  model: string;
  latency_ms: number;
  action: 'none' | 'show_on_map';
}

export interface Camera {
  id: string;
  name: string;
  provider: Provider;
  lat: number;
  lon: number;
  source_type: SourceType;
  is_playback: boolean;
  online: boolean;
  interval_s: number;
  feed_refresh_s: number;
  last_frame_at: string | null;
  calibration: Calibration;
  reading: Reading | null;
}

export interface AlertEvent {
  id: string;
  camera_id: string;
  camera_name: string;
  level: Level;
  water_ratio: number;
  timestamp: string;
  message: string;
  kind?: 'alert' | 'all_clear';
}

export interface CameraDraft {
  name: string;
  provider: Provider;
  lat: number;
  lon: number;
  source_type: 'snapshot' | 'stream' | 'upload';
  source_url: string;
  username?: string;
  password?: string;
  interval_s: number;
  feed_refresh_s: number;
  calibration: Calibration;
}

export type ServerMessage =
  | { type: 'snapshot'; cameras: Camera[] }
  | { type: 'reading'; reading: Reading }
  | { type: 'alert'; alert: AlertEvent }
  | { type: 'status'; camera_id: string; online: boolean }
  | { type: 'camera'; camera: Camera }
  | { type: 'camera_removed'; camera_id: string }
  | { type: 'ping' };

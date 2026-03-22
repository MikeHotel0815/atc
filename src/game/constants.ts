// filepath: src/game/constants.ts
export const SEP_LATERAL_NM = 3;
export const SEP_VERTICAL_FT = 1000;
export const WARN_LATERAL_NM = 5;
export const WARN_VERTICAL_FT = 2000;

export const RADAR_RANGE_NM = 40;
export const SWEEP_PERIOD_MS = 4000;
export const TRAIL_LENGTH = 8;
export const TRAIL_INTERVAL_MS = 5000;

export const ILS_CONE_HALF_DEG = 3;
export const ILS_CONE_LENGTH_NM = 15;
export const LOCALIZER_WIDTH_DEG = 30;  // max intercept angle
export const GLIDESLOPE_DEG = 3;

// Aircraft turn/climb performance
export const TURN_RATE_DEG_S = 3;
export const MAX_VS_FPM = 2000;
export const ACCEL_KTS_S = 5;

// Spawn config
export const SPAWN_INTERVAL_MIN_S = 45;
export const SPAWN_INTERVAL_MAX_S = 90;
export const SPAWN_DISTANCE_NM = 30;
export const MAX_AIRCRAFT = 10;

// Score
export const SCORE_LANDING = 100;
export const SCORE_SEPARATION_VIOLATION = -50;
export const SCORE_COLLISION = -200;
export const SCORE_GOAROUND = -30;

// Aircraft types and their approach speeds (kts)
// wake: M=Medium, H=Heavy, J=Super (ICAO wake turbulence category)
export const AIRCRAFT_TYPES: Record<string, { approachKts: number; cruiseKts: number; wake: 'M' | 'H' | 'J' }> = {
  B738: { approachKts: 140, cruiseKts: 280, wake: 'M' },
  A320: { approachKts: 137, cruiseKts: 280, wake: 'M' },
  A321: { approachKts: 145, cruiseKts: 280, wake: 'M' },
  B77W: { approachKts: 155, cruiseKts: 290, wake: 'H' },
  A388: { approachKts: 160, cruiseKts: 290, wake: 'J' },
  E190: { approachKts: 130, cruiseKts: 260, wake: 'M' },
  DH8D: { approachKts: 120, cruiseKts: 200, wake: 'M' },
  CRJ9: { approachKts: 125, cruiseKts: 250, wake: 'M' },
};

export const CALLSIGN_PREFIXES = [
  'DLH', 'EZY', 'RYR', 'BAW', 'AFL', 'UAE', 'THY', 'SWR',
  'KLM', 'IBE', 'AUA', 'SAS', 'TAP', 'VKG', 'CFG', 'TUI',
];

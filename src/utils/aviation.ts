// filepath: src/utils/aviation.ts

/** Normalise heading to 0-360 */
export function normaliseHdg(h: number): number {
  return ((h % 360) + 360) % 360;
}

/** Signed angular difference: target - current, range -180..+180 */
export function headingDiff(current: number, target: number): number {
  const diff = normaliseHdg(target - current);
  return diff > 180 ? diff - 360 : diff;
}

/**
 * Turn heading toward target at given rate (deg/s).
 * Returns new heading after dt seconds.
 */
export function turnToHeading(
  current: number,
  target: number,
  dt: number,
  ratePerSec = 3,
  direction?: 'left' | 'right'
): number {
  let diff: number;
  if (direction === 'right') {
    // Always turn clockwise
    diff = normaliseHdg(target - current); // 0..360, positive = right
    if (diff === 0) return target;
  } else if (direction === 'left') {
    // Always turn counter-clockwise
    const raw = normaliseHdg(target - current);
    diff = raw === 0 ? 0 : -(360 - raw); // negative = left
  } else {
    diff = headingDiff(current, target); // shortest path
  }
  const maxTurn = ratePerSec * dt;
  if (Math.abs(diff) <= maxTurn) return target;
  return normaliseHdg(current + Math.sign(diff) * maxTurn);
}

/**
 * Adjust altitude toward target at given vertical speed (fpm).
 * Returns new altitude in feet after dt seconds.
 */
export function adjustAltitude(
  current: number,
  target: number,
  dt: number,
  maxVsFpm = 2000
): { alt: number; vs: number } {
  const diff = target - current;
  const maxDelta = (maxVsFpm / 60) * dt;
  if (Math.abs(diff) <= maxDelta) {
    return { alt: target, vs: 0 };
  }
  const vs = Math.sign(diff) * maxVsFpm;
  return { alt: current + Math.sign(diff) * maxDelta, vs };
}

/**
 * Adjust speed toward target at given acceleration (kts/s).
 */
export function adjustSpeed(
  current: number,
  target: number,
  dt: number,
  accelKtsPerSec = 5
): number {
  const diff = target - current;
  const maxDelta = accelKtsPerSec * dt;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

/** ILS glideslope altitude at given distance from threshold (3° slope) */
export function glideslopeAltitude(distNM: number, thresholdElevFt: number): number {
  // tan(3°) * distM ≈ 318 ft/NM
  return thresholdElevFt + distNM * 318;
}

/** Convert knots to NM per second */
export function ktsToNMps(kts: number): number {
  return kts / 3600;
}

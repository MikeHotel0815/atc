// filepath: src/game/ILS.ts
import type { Aircraft } from '@/types/aircraft';
import type { Runway } from '@/types/airport';
import { distanceNM, bearingBetween } from '@/utils/geo';
import { headingDiff, glideslopeAltitude } from '@/utils/aviation';

export interface ILSStatus {
  canIntercept: boolean;
  localizerDeviationDeg: number;
  glideslopeDeviationFt: number;
  distanceToThresholdNM: number;
  established: boolean;
}

export function getILSStatus(ac: Aircraft, runway: Runway): ILSStatus {
  const distNM = distanceNM(ac.lat, ac.lng, runway.thresholdLat, runway.thresholdLng);
  const bearingToThreshold = bearingBetween(ac.lat, ac.lng, runway.thresholdLat, runway.thresholdLng);

  // Localizer: angle between aircraft heading and runway course
  const locDeviation = headingDiff(runway.heading, bearingToThreshold);

  // Glideslope deviation
  const idealAlt = glideslopeAltitude(distNM, runway as unknown as { elevationFt?: number } extends { elevationFt: infer T } ? T : number);
  const gsDeviation = ac.altitudeFt - idealAlt;

  const canIntercept =
    Math.abs(locDeviation) < 45 &&
    distNM < 25 &&
    ac.altitudeFt < 9000;

  const established =
    Math.abs(locDeviation) < 1.5 &&
    Math.abs(gsDeviation) < 500 &&
    distNM < 12;

  return {
    canIntercept,
    localizerDeviationDeg: locDeviation,
    glideslopeDeviationFt: gsDeviation,
    distanceToThresholdNM: distNM,
    established,
  };
}

export function getILSStatusForRunway(ac: Aircraft, runway: Runway): ILSStatus {
  const distNM = distanceNM(ac.lat, ac.lng, runway.thresholdLat, runway.thresholdLng);
  const bearingToThreshold = bearingBetween(ac.lat, ac.lng, runway.thresholdLat, runway.thresholdLng);
  const locDeviation = headingDiff(runway.heading, bearingToThreshold);
  const idealAlt = glideslopeAltitude(distNM, 0);
  const gsDeviation = ac.altitudeFt - idealAlt;

  return {
    canIntercept: Math.abs(locDeviation) < 45 && distNM < 25 && ac.altitudeFt < 9000,
    localizerDeviationDeg: locDeviation,
    glideslopeDeviationFt: gsDeviation,
    distanceToThresholdNM: distNM,
    established: Math.abs(locDeviation) < 1.5 && Math.abs(gsDeviation) < 500 && distNM < 12,
  };
}

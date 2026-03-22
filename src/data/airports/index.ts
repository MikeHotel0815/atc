// filepath: src/data/airports/index.ts
import { EDDF_AIRPORT, EDDF_WAYPOINTS, EDDF_STARS, EDDF_ILS } from './EDDF';
import type { Airport } from '@/types/airport';
import type { STAR, Waypoint } from '@/types/navdata';

export interface AirportStaticData {
  airport: Airport;
  waypoints: Record<string, Waypoint>;
  stars: STAR[];
}

export const AIRPORT_REGISTRY: Record<string, AirportStaticData> = {
  EDDF: {
    airport: EDDF_AIRPORT,
    waypoints: EDDF_WAYPOINTS,
    stars: EDDF_STARS,
  },
};

export function getStaticAirportData(icao: string): AirportStaticData | null {
  return AIRPORT_REGISTRY[icao.toUpperCase()] ?? null;
}

export function getStaticAirport(icao: string): Airport | null {
  return getStaticAirportData(icao)?.airport ?? null;
}

export function getStaticWaypoints(icao: string): Waypoint[] {
  const data = getStaticAirportData(icao);
  if (!data) return [];
  return Object.values(data.waypoints);
}

export function getStaticStars(icao: string): STAR[] {
  return getStaticAirportData(icao)?.stars ?? [];
}

export { EDDF_ILS };

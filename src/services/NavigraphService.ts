// filepath: src/services/NavigraphService.ts
import type { NavDatabase, STAR, Waypoint } from '@/types/navdata';

// Hardcoded fallback navdata for supported airports
const FALLBACK_NAVDATA: Record<string, NavDatabase> = {
  EDDF: {
    waypoints: {
      KERAX: { id: 'KERAX', name: 'KERAX', lat: 50.2417, lng: 9.1333, type: 'fix' },
      TOBAK: { id: 'TOBAK', name: 'TOBAK', lat: 50.1944, lng: 8.9333, type: 'fix' },
      NIRSI: { id: 'NIRSI', name: 'NIRSI', lat: 50.1583, lng: 8.7500, type: 'fix' },
      SOBRA: { id: 'SOBRA', name: 'SOBRA', lat: 50.2000, lng: 8.3000, type: 'fix' },
      RID:   { id: 'RID',   name: 'RID VOR', lat: 49.8444, lng: 8.5844, type: 'vor' },
    },
    stars: [
      {
        id: 'KERAX1A',
        icao: 'EDDF',
        runway: '25L',
        waypoints: [],
        legs: [
          { waypointId: 'KERAX', altRestrictionFt: 8000 },
          { waypointId: 'TOBAK', altRestrictionFt: 6000 },
          { waypointId: 'NIRSI', altRestrictionFt: 4000, speedRestrictionKts: 250 },
        ],
      },
    ],
  },
  EGLL: {
    waypoints: {
      LOGAN: { id: 'LOGAN', name: 'LOGAN', lat: 51.7167, lng: -0.8500, type: 'fix' },
      BIG:   { id: 'BIG',   name: 'BIG VOR', lat: 51.3306, lng: 0.0341, type: 'vor' },
      OCK:   { id: 'OCK',   name: 'OCK VOR', lat: 51.3058, lng: -0.4475, type: 'vor' },
    },
    stars: [
      {
        id: 'LOGAN1G',
        icao: 'EGLL',
        runway: '27L',
        waypoints: [],
        legs: [
          { waypointId: 'LOGAN', altRestrictionFt: 7000 },
          { waypointId: 'BIG', altRestrictionFt: 5000 },
          { waypointId: 'OCK', altRestrictionFt: 3000, speedRestrictionKts: 220 },
        ],
      },
    ],
  },
  KJFK: {
    waypoints: {
      CAMRN: { id: 'CAMRN', name: 'CAMRN', lat: 40.5558, lng: -74.3131, type: 'fix' },
      LENDY: { id: 'LENDY', name: 'LENDY', lat: 41.3278, lng: -74.3694, type: 'fix' },
      COATE: { id: 'COATE', name: 'COATE', lat: 40.7000, lng: -73.9167, type: 'fix' },
    },
    stars: [
      {
        id: 'CAMRN4',
        icao: 'KJFK',
        runway: '31L',
        waypoints: [],
        legs: [
          { waypointId: 'CAMRN', altRestrictionFt: 7000 },
          { waypointId: 'LENDY', altRestrictionFt: 5000 },
          { waypointId: 'COATE', altRestrictionFt: 3000 },
        ],
      },
    ],
  },
  EDDL: {
    waypoints: {
      ADANA: { id: 'ADANA', name: 'ADANA', lat: 51.4333, lng: 6.5000, type: 'fix' },
      MASEK: { id: 'MASEK', name: 'MASEK', lat: 51.3500, lng: 6.6000, type: 'fix' },
    },
    stars: [
      {
        id: 'ADANA1A',
        icao: 'EDDL',
        runway: '23L',
        waypoints: [],
        legs: [
          { waypointId: 'ADANA', altRestrictionFt: 8000 },
          { waypointId: 'MASEK', altRestrictionFt: 5000, speedRestrictionKts: 250 },
        ],
      },
    ],
  },
};

/** Resolve waypoints for a STAR leg sequence */
function resolveWaypoints(star: STAR, db: NavDatabase): Waypoint[] {
  return star.legs
    .map((leg) => db.waypoints[leg.waypointId])
    .filter((wp): wp is Waypoint => wp !== undefined);
}

export function getNavDatabase(icao: string): NavDatabase | null {
  return FALLBACK_NAVDATA[icao.toUpperCase()] ?? null;
}

export function getSTARWaypoints(icao: string, runway?: string): Waypoint[] {
  const db = getNavDatabase(icao);
  if (!db) return [];

  const stars = runway
    ? db.stars.filter((s) => s.runway === runway || s.runway === 'ALL')
    : db.stars;

  const seen = new Set<string>();
  const result: Waypoint[] = [];
  for (const star of stars) {
    for (const wp of resolveWaypoints(star, db)) {
      if (!seen.has(wp.id)) {
        seen.add(wp.id);
        result.push(wp);
      }
    }
  }
  return result;
}

export function getAllWaypoints(icao: string): Waypoint[] {
  const db = getNavDatabase(icao);
  if (!db) return [];
  return Object.values(db.waypoints);
}

/** Attempt to load custom navdata.json from /api/navdata/:icao */
export async function fetchNavData(icao: string): Promise<NavDatabase | null> {
  try {
    const res = await fetch(`/api/navdata/${icao.toUpperCase()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as NavDatabase;
  } catch {
    return getNavDatabase(icao);
  }
}

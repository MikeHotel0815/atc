// filepath: src/services/AirportDataService.ts
import type { Airport, OsmWay, Runway } from '@/types/airport';
import type { Waypoint, STAR } from '@/types/navdata';
import { getStaticAirportData, getStaticWaypoints, getStaticStars } from '@/data/airports/index';
import { bearingBetween } from '@/utils/geo';
import { fetchNavData } from './NavigraphService';

// Legacy fallback airports for non-registered ICAOs
const LEGACY_FALLBACKS: Record<string, Airport> = {
  EGLL: {
    icao: 'EGLL', name: 'London Heathrow', lat: 51.4775, lng: -0.4614,
    elevationFt: 83, magneticVariation: -0.3, transitionAltitudeFt: 6000,
    runways: [
      { id: '27L', recipId: '09R', heading: 270, recipHeading: 90, thresholdLat: 51.4806, thresholdLng: -0.4337, endLat: 51.4806, endLng: -0.5650, lengthM: 3901, widthM: 50, elevationFt: 79, ils: { runway: '27L', localizerCourse: 270, glideslopeAngle: 3.0, frequencyMHz: 110.30, category: 'III' } },
      { id: '27R', recipId: '09L', heading: 270, recipHeading: 90, thresholdLat: 51.4731, thresholdLng: -0.4337, endLat: 51.4731, endLng: -0.5650, lengthM: 3658, widthM: 50, elevationFt: 77, ils: { runway: '27R', localizerCourse: 270, glideslopeAngle: 3.0, frequencyMHz: 111.75, category: 'III' } },
      { id: '09L', recipId: '27R', heading: 90, recipHeading: 270, thresholdLat: 51.4731, thresholdLng: -0.5650, endLat: 51.4731, endLng: -0.4337, lengthM: 3658, widthM: 50, elevationFt: 77, ils: { runway: '09L', localizerCourse: 90, glideslopeAngle: 3.0, frequencyMHz: 109.50, category: 'I' } },
      { id: '09R', recipId: '27L', heading: 90, recipHeading: 270, thresholdLat: 51.4806, thresholdLng: -0.5650, endLat: 51.4806, endLng: -0.4337, lengthM: 3901, widthM: 50, elevationFt: 79, ils: { runway: '09R', localizerCourse: 90, glideslopeAngle: 3.0, frequencyMHz: 110.90, category: 'I' } },
    ],
  },
  KJFK: {
    icao: 'KJFK', name: 'New York JFK', lat: 40.6413, lng: -73.7781,
    elevationFt: 13, magneticVariation: -13.5, transitionAltitudeFt: 18000,
    runways: [
      { id: '31L', recipId: '13R', heading: 310, recipHeading: 130, thresholdLat: 40.6195, thresholdLng: -73.7456, endLat: 40.6550, endLng: -73.8100, lengthM: 3460, widthM: 46, elevationFt: 13, ils: { runway: '31L', localizerCourse: 310, glideslopeAngle: 3.0, frequencyMHz: 109.90, category: 'I' } },
      { id: '22R', recipId: '04L', heading: 220, recipHeading: 40,  thresholdLat: 40.6609, thresholdLng: -73.7612, endLat: 40.6308, endLng: -73.8084, lengthM: 3750, widthM: 46, elevationFt: 13, ils: { runway: '22R', localizerCourse: 220, glideslopeAngle: 3.0, frequencyMHz: 111.90, category: 'I' } },
      { id: '13R', recipId: '31L', heading: 130, recipHeading: 310, thresholdLat: 40.6550, thresholdLng: -73.8100, endLat: 40.6195, endLng: -73.7456, lengthM: 3460, widthM: 46, elevationFt: 13 },
    ],
  },
  EDDL: {
    icao: 'EDDL', name: 'Düsseldorf', lat: 51.2895, lng: 6.7668,
    elevationFt: 147, magneticVariation: 2.5, transitionAltitudeFt: 5000,
    runways: [
      { id: '23L', recipId: '05R', heading: 230, recipHeading: 50, thresholdLat: 51.3064, thresholdLng: 6.7540, endLat: 51.2695, endLng: 6.7960, lengthM: 3000, widthM: 45, elevationFt: 145, ils: { runway: '23L', localizerCourse: 230, glideslopeAngle: 3.0, frequencyMHz: 110.10, category: 'III' } },
      { id: '05R', recipId: '23L', heading: 50,  recipHeading: 230, thresholdLat: 51.2695, thresholdLng: 6.7960, endLat: 51.3064, endLng: 6.7540, lengthM: 3000, widthM: 45, elevationFt: 149, ils: { runway: '05R', localizerCourse: 50,  glideslopeAngle: 3.0, frequencyMHz: 111.55, category: 'I' } },
    ],
  },
};

export const AVAILABLE_AIRPORTS = ['EDDF', 'EGLL', 'KJFK', 'EDDL'];

// ── Overpass Response Types ───────────────────────────────────────────────────
interface OverpassElement {
  type: 'way' | 'node';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  lat?: number;
  lon?: number;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// ── Main fetch function ───────────────────────────────────────────────────────
export async function fetchAirportData(icao: string): Promise<{ airport: Airport; waypoints: Waypoint[]; stars: STAR[] }> {
  const upper = icao.toUpperCase();

  // Navigraph-AIRAC-Daten (falls auf dem Server installiert), sonst statische Daten
  const navdata = await fetchNavData(upper);
  const staticData = getStaticAirportData(upper);
  const baseAirport: Airport = navdata?.airport ?? staticData?.airport ?? LEGACY_FALLBACKS[upper] ?? buildGenericAirport(upper);
  const waypoints: Waypoint[] = navdata?.waypoints ?? (staticData ? getStaticWaypoints(upper) : []);
  const stars: STAR[] = navdata?.stars ?? getStaticStars(upper);

  // Fetch Overpass geometry
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/airport/${upper}`);
    if (res.ok) {
      const osmData: OverpassResponse = await res.json();
      // Navigraph-Schwellen sind genauer als OSM → nur bei statischen Daten abgleichen
      const merged = mergeOsmData(baseAirport, osmData, !navdata);
      return { airport: merged, waypoints, stars };
    }
  } catch (err) {
    console.warn(`Overpass fetch failed for ${upper}:`, err);
  }

  return { airport: baseAirport, waypoints, stars };
}

// ── OSM Merge ─────────────────────────────────────────────────────────────────
function mergeOsmData(base: Airport, osm: OverpassResponse, reconcile: boolean): Airport {
  const ways = osm.elements.filter((e): e is OverpassElement & { geometry: Array<{ lat: number; lon: number }> } =>
    e.type === 'way' && Array.isArray(e.geometry) && e.geometry.length >= 2
  );
  const nodes = osm.elements.filter((e) => e.type === 'node' && e.lat != null && e.lon != null);

  const taxiways: OsmWay[] = [];
  const aprons: OsmWay[] = [];
  const terminals: OsmWay[] = [];
  const osmRunways: OsmWay[] = [];

  for (const w of ways) {
    const tag = w.tags?.aeroway ?? '';
    const way: OsmWay = {
      id: w.id,
      geometry: w.geometry.map((p) => ({ lat: p.lat, lng: p.lon })),
      tags: w.tags ?? {},
    };
    if (tag === 'runway')    osmRunways.push(way);
    else if (tag === 'taxiway' || tag === 'taxilane') taxiways.push(way);
    else if (tag === 'apron')    aprons.push(way);
    else if (tag === 'terminal') terminals.push(way);
  }

  const holdingPoints = nodes
    .filter((n) => n.tags?.aeroway === 'holding_position')
    .map((n) => ({ lat: n.lat!, lng: n.lon!, name: n.tags?.ref }));

  // Update runway thresholds from OSM if available
  const runways = reconcile ? reconcileRunways(base.runways, osmRunways) : base.runways;

  return {
    ...base,
    runways,
    layer: { taxiways, aprons, terminals, holdingPoints },
  };
}

/** Try to match OSM runway ways to our named runways and update coordinates */
function reconcileRunways(baseRunways: Runway[], osmRunways: OsmWay[]): Runway[] {
  if (osmRunways.length === 0) return baseRunways;

  return baseRunways.map((rwy) => {
    // Match by ref tag containing runway ID
    const match = osmRunways.find((ow) => {
      const ref = (ow.tags.ref ?? '').toUpperCase();
      return ref.includes(rwy.id) || ref.includes(rwy.recipId);
    });
    if (!match || match.geometry.length < 2) return rwy;

    const pts = match.geometry;
    const p1 = pts[0];
    const p2 = pts[pts.length - 1];
    const hdg = bearingBetween(p1.lat, p1.lng, p2.lat, p2.lng);

    // Determine which end is the threshold for this runway direction
    const isForward = Math.abs(angularDiff(hdg, rwy.heading)) < 90;
    const thrPt  = isForward ? p1 : p2;
    const endPt  = isForward ? p2 : p1;

    return {
      ...rwy,
      thresholdLat: thrPt.lat,
      thresholdLng: thrPt.lng,
      endLat: endPt.lat,
      endLng: endPt.lng,
    };
  });
}

function angularDiff(a: number, b: number): number {
  const d = ((a - b) % 360 + 360) % 360;
  return d > 180 ? d - 360 : d;
}

function buildGenericAirport(icao: string): Airport {
  return {
    icao, name: icao, lat: 51.5, lng: 0.0,
    elevationFt: 0, magneticVariation: 0, transitionAltitudeFt: 5000,
    runways: [{
      id: '27', recipId: '09', heading: 270, recipHeading: 90,
      thresholdLat: 51.5, thresholdLng: 0.02,
      endLat: 51.5, endLng: -0.02,
      lengthM: 3000, widthM: 45, elevationFt: 0,
      ils: { runway: '27', localizerCourse: 270, glideslopeAngle: 3.0, frequencyMHz: 109.9, category: 'I' },
    }],
  };
}

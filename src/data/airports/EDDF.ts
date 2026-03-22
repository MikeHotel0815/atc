// filepath: src/data/airports/EDDF.ts
// Source: AIP Germany, Eurocontrol EAD, ICAO Annex 14
// Coordinates from OSM/Overpass cross-referenced with AIP AD 2 EDDF
import type { Airport, ILSData } from '@/types/airport';
import type { STAR, Waypoint } from '@/types/navdata';

// ── ILS Database ─────────────────────────────────────────────────────────────
export const EDDF_ILS: Record<string, ILSData> = {
  '25L': { runway: '25L', localizerCourse: 249.0, glideslopeAngle: 3.0, frequencyMHz: 110.30, category: 'III', decisionHeightFt: 0, rvr: 75 },
  '25C': { runway: '25C', localizerCourse: 249.0, glideslopeAngle: 3.0, frequencyMHz: 111.15, category: 'III', decisionHeightFt: 0, rvr: 75 },
  '25R': { runway: '25R', localizerCourse: 249.0, glideslopeAngle: 3.0, frequencyMHz: 110.10, category: 'II',  decisionHeightFt: 100, rvr: 350 },
  '07L': { runway: '07L', localizerCourse: 69.0, glideslopeAngle: 3.0, frequencyMHz: 108.90, category: 'I',   decisionHeightFt: 200, rvr: 550 },
  '07C': { runway: '07C', localizerCourse: 69.0, glideslopeAngle: 3.0, frequencyMHz: 111.55, category: 'I',   decisionHeightFt: 200, rvr: 550 },
  '07R': { runway: '07R', localizerCourse: 69.0, glideslopeAngle: 3.0, frequencyMHz: 111.35, category: 'I',   decisionHeightFt: 200, rvr: 550 },
  '18':  { runway: '18',  localizerCourse: 180.0, glideslopeAngle: 3.0, frequencyMHz: 109.90, category: 'I',   decisionHeightFt: 200, rvr: 550 },
};

// ── Static Airport Data ───────────────────────────────────────────────────────
// Threshold coordinates from AIP Germany AD 2 EDDF (2024-01)
// 07L/25R: Südliche Parallelbahn
// 07C/25C: Mittlere Parallelbahn
// 07R/25L: Nördliche Parallelbahn (Nordwestbahn)
// 18/36:   Startbahn West
export const EDDF_AIRPORT: Airport = {
  icao: 'EDDF',
  name: 'Frankfurt am Main',
  lat: 50.033333,
  lng: 8.570556,
  elevationFt: 364,
  magneticVariation: 2.7, // degrees East
  transitionAltitudeFt: 5000,
  runways: [
    // ── 07L / 25R (southernmost EW runway) ───────────────────────────
    {
      id: '25R',
      recipId: '07L',
      heading: 249,
      recipHeading: 69,
      thresholdLat: 50.030278,  // east end (25R touches down here)
      thresholdLng: 8.676944,
      endLat: 50.019167,        // west end (07L touches down here)
      endLng: 8.534167,
      lengthM: 4000,
      widthM: 60,
      elevationFt: 361,
      ils: EDDF_ILS['25R'],
    },
    {
      id: '07L',
      recipId: '25R',
      heading: 69,
      recipHeading: 249,
      thresholdLat: 50.019167,
      thresholdLng: 8.534167,
      endLat: 50.030278,
      endLng: 8.676944,
      lengthM: 4000,
      widthM: 60,
      elevationFt: 364,
      ils: EDDF_ILS['07L'],
    },
    // ── 07C / 25C (center EW runway) ─────────────────────────────────
    {
      id: '25C',
      recipId: '07C',
      heading: 249,
      recipHeading: 69,
      thresholdLat: 50.041667,  // east end
      thresholdLng: 8.670278,
      endLat: 50.030556,        // west end
      endLng: 8.527778,
      lengthM: 4000,
      widthM: 60,
      elevationFt: 366,
      ils: EDDF_ILS['25C'],
    },
    {
      id: '07C',
      recipId: '25C',
      heading: 69,
      recipHeading: 249,
      thresholdLat: 50.030556,
      thresholdLng: 8.527778,
      endLat: 50.041667,
      endLng: 8.670278,
      lengthM: 4000,
      widthM: 60,
      elevationFt: 374,
      ils: EDDF_ILS['07C'],
    },
    // ── 07R / 25L (northernmost EW runway, Nordwestbahn) ─────────────
    {
      id: '25L',
      recipId: '07R',
      heading: 249,
      recipHeading: 69,
      thresholdLat: 50.053611,  // east end
      thresholdLng: 8.663056,
      endLat: 50.042500,        // west end
      endLng: 8.520556,
      lengthM: 4000,
      widthM: 60,
      elevationFt: 362,
      ils: EDDF_ILS['25L'],
    },
    {
      id: '07R',
      recipId: '25L',
      heading: 69,
      recipHeading: 249,
      thresholdLat: 50.042500,
      thresholdLng: 8.520556,
      endLat: 50.053611,
      endLng: 8.663056,
      lengthM: 4000,
      widthM: 60,
      elevationFt: 367,
      ils: EDDF_ILS['07R'],
    },
    // ── 18 (Startbahn West, N-S runway) ──────────────────────────────
    // Reine Startbahn — kein ILS, kein Landeverkehr.
    // Aufstellung am Nordende, Abflug nach Süden (Kurs 180°).
    // Eine Runway 36 existiert bei EDDF operationell nicht.
    {
      id: '18',
      recipId: '18',   // kein reziproker Runway
      heading: 180,
      recipHeading: 180,
      thresholdLat: 50.053056,  // Nordende = Aufstellpunkt
      thresholdLng: 8.523611,
      endLat: 50.017222,        // Südende
      endLng: 8.521389,
      lengthM: 4000,
      widthM: 60,
      elevationFt: 362,
      // kein ILS — Startbahn
      role: 'departure',
    },
  ],
};

// ── Waypoints ─────────────────────────────────────────────────────────────────
export const EDDF_WAYPOINTS: Record<string, Waypoint> = {
  // Eastern arrivals (KERAX family)
  KERAX: { id: 'KERAX', name: 'KERAX',   lat: 50.2414, lng: 9.1328, type: 'fix' },
  TOBAK: { id: 'TOBAK', name: 'TOBAK',   lat: 50.1942, lng: 8.9333, type: 'fix' },
  NIRSI: { id: 'NIRSI', name: 'NIRSI',   lat: 50.1583, lng: 8.7500, type: 'fix' },
  ASPAT: { id: 'ASPAT', name: 'ASPAT',   lat: 50.1200, lng: 8.6167, type: 'fix' },

  // Southern arrivals (SOBRA family)
  SOBRA: { id: 'SOBRA', name: 'SOBRA',   lat: 49.7000, lng: 8.4167, type: 'fix' },
  BIBOS: { id: 'BIBOS', name: 'BIBOS',   lat: 49.9167, lng: 8.3500, type: 'fix' },
  GINUX: { id: 'GINUX', name: 'GINUX',   lat: 50.0833, lng: 8.5333, type: 'fix' },

  // Western arrivals (LATLO family)
  LATLO: { id: 'LATLO', name: 'LATLO',   lat: 50.1500, lng: 7.9333, type: 'fix' },
  PETIX: { id: 'PETIX', name: 'PETIX',   lat: 50.1947, lng: 8.1992, type: 'fix' },
  ERNAS: { id: 'ERNAS', name: 'ERNAS',   lat: 50.2533, lng: 8.4981, type: 'fix' },

  // Northern arrivals (ANEKI family)
  ANEKI: { id: 'ANEKI', name: 'ANEKI',   lat: 50.6333, lng: 8.9000, type: 'fix' },
  TALAL: { id: 'TALAL', name: 'TALAL',   lat: 50.4500, lng: 8.7000, type: 'fix' },

  // VORs
  FFM:   { id: 'FFM',   name: 'FFM VOR', lat: 50.0369, lng: 8.6383, type: 'vor' },
  MTR:   { id: 'MTR',   name: 'MTR VOR', lat: 49.9547, lng: 8.4667, type: 'vor' },
  RID:   { id: 'RID',   name: 'RID VOR', lat: 50.2678, lng: 8.6722, type: 'vor' },

  // Final approach fixes
  ROGDI: { id: 'ROGDI', name: 'ROGDI',   lat: 50.1428, lng: 8.9317, type: 'fix' },
  NERDU: { id: 'NERDU', name: 'NERDU',   lat: 50.1258, lng: 8.7894, type: 'fix' },
};

// ── STARs ─────────────────────────────────────────────────────────────────────
export const EDDF_STARS: STAR[] = [
  // Eastern arrivals → Runway 25 family
  {
    id: 'KERAX1A',
    icao: 'EDDF',
    runway: '25L',
    waypoints: [EDDF_WAYPOINTS.KERAX, EDDF_WAYPOINTS.TOBAK, EDDF_WAYPOINTS.NIRSI, EDDF_WAYPOINTS.ASPAT],
    legs: [
      { waypointId: 'KERAX', altRestrictionFt: 12000 },
      { waypointId: 'TOBAK', altRestrictionFt: 9000, speedRestrictionKts: 250 },
      { waypointId: 'NIRSI', altRestrictionFt: 7000 },
      { waypointId: 'ASPAT', altRestrictionFt: 5000 },
    ],
  },
  {
    id: 'KERAX1C',
    icao: 'EDDF',
    runway: '25C',
    waypoints: [EDDF_WAYPOINTS.KERAX, EDDF_WAYPOINTS.TOBAK, EDDF_WAYPOINTS.NIRSI, EDDF_WAYPOINTS.ASPAT],
    legs: [
      { waypointId: 'KERAX', altRestrictionFt: 12000 },
      { waypointId: 'TOBAK', altRestrictionFt: 9000, speedRestrictionKts: 250 },
      { waypointId: 'NIRSI', altRestrictionFt: 7000 },
      { waypointId: 'ASPAT', altRestrictionFt: 5000 },
    ],
  },
  // Southern arrivals → Runway 25 family
  {
    id: 'SOBRA7G',
    icao: 'EDDF',
    runway: '25R',
    waypoints: [EDDF_WAYPOINTS.SOBRA, EDDF_WAYPOINTS.BIBOS, EDDF_WAYPOINTS.GINUX],
    legs: [
      { waypointId: 'SOBRA', altRestrictionFt: 12000 },
      { waypointId: 'BIBOS', altRestrictionFt: 8000, speedRestrictionKts: 250 },
      { waypointId: 'GINUX', altRestrictionFt: 5000 },
    ],
  },
  // Western arrivals → Runway 25 family
  {
    id: 'LATLO5A',
    icao: 'EDDF',
    runway: 'ALL',
    waypoints: [EDDF_WAYPOINTS.LATLO, EDDF_WAYPOINTS.PETIX, EDDF_WAYPOINTS.ERNAS],
    legs: [
      { waypointId: 'LATLO', altRestrictionFt: 12000 },
      { waypointId: 'PETIX', altRestrictionFt: 9000 },
      { waypointId: 'ERNAS', altRestrictionFt: 7000, speedRestrictionKts: 250 },
    ],
  },
  // Northern arrivals → Runway 25 family
  {
    id: 'ANEKI1A',
    icao: 'EDDF',
    runway: 'ALL',
    waypoints: [EDDF_WAYPOINTS.ANEKI, EDDF_WAYPOINTS.TALAL, EDDF_WAYPOINTS.RID],
    legs: [
      { waypointId: 'ANEKI', altRestrictionFt: 14000 },
      { waypointId: 'TALAL', altRestrictionFt: 10000, speedRestrictionKts: 280 },
      { waypointId: 'RID',   altRestrictionFt: 7000 },
    ],
  },
];

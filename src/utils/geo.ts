// filepath: src/utils/geo.ts
const NM_TO_M = 1852;
const R_NM = 3440.065; // Earth radius in NM

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** True bearing from point 1 to point 2 (degrees 0-360) */
export function bearingBetween(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLng = toRad(lng2 - lng1);
  const rlat1 = toRad(lat1);
  const rlat2 = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(rlat2);
  const x = Math.cos(rlat1) * Math.sin(rlat2) - Math.sin(rlat1) * Math.cos(rlat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Great-circle distance in nautical miles */
export function distanceNM(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const rlat1 = toRad(lat1), rlat2 = toRad(lat2);
  const dlat = toRad(lat2 - lat1);
  const dlng = toRad(lng2 - lng1);
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(dlng / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.sqrt(a));
}

/** Destination point given start, bearing (deg), distance (NM) */
export function destinationPoint(
  lat: number, lng: number,
  bearingDeg: number,
  distNM: number
): { lat: number; lng: number } {
  const d = distNM / R_NM;
  const brng = toRad(bearingDeg);
  const rlat = toRad(lat);
  const rlng = toRad(lng);
  const latOut = Math.asin(
    Math.sin(rlat) * Math.cos(d) + Math.cos(rlat) * Math.sin(d) * Math.cos(brng)
  );
  const lngOut =
    rlng +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(rlat),
      Math.cos(d) - Math.sin(rlat) * Math.sin(latOut)
    );
  return { lat: toDeg(latOut), lng: toDeg(lngOut) };
}

/** Convert lat/lng to canvas pixel coordinates */
export function latLngToCanvas(
  lat: number, lng: number,
  centerLat: number, centerLng: number,
  pxPerNM: number,
  canvasW: number, canvasH: number
): { x: number; y: number } {
  const dLat = lat - centerLat;
  const dLng = lng - centerLng;
  // Approximate NM: 1° lat ≈ 60 NM, 1° lng ≈ 60*cos(lat) NM
  const northNM = dLat * 60;
  const eastNM = dLng * 60 * Math.cos(toRad(centerLat));
  return {
    x: canvasW / 2 + eastNM * pxPerNM,
    y: canvasH / 2 - northNM * pxPerNM,
  };
}

export { NM_TO_M };

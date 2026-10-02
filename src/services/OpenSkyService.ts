// filepath: src/services/OpenSkyService.ts

export interface LiveAircraft {
  callsign: string;
  lat: number;
  lng: number;
  altitudeFt: number;
  headingDeg: number;
  speedKts: number;
}

interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  lat: number | null;
  lon: number | null;
  baro_altitude: number | null;
  true_track: number | null;
  velocity: number | null;
  on_ground: boolean;
}

interface OpenSkyResponse {
  states: OpenSkyState[] | null;
}

export async function fetchLiveTraffic(
  centerLat: number,
  centerLng: number,
  radiusNM = 50
): Promise<LiveAircraft[]> {
  // 1° lat ≈ 60 NM
  const degRadius = radiusNM / 60;
  const lamin = centerLat - degRadius;
  const lamax = centerLat + degRadius;
  const lomin = centerLng - degRadius;
  const lomax = centerLng + degRadius;

  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}api/traffic?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: OpenSkyResponse = await res.json();

    return (data.states ?? [])
      .filter((s) => s.lat !== null && s.lon !== null && !s.on_ground)
      .map((s) => ({
        callsign: (s.callsign?.trim() || s.icao24).toUpperCase(),
        lat: s.lat!,
        lng: s.lon!,
        altitudeFt: s.baro_altitude ? Math.round(s.baro_altitude * 3.281) : 5000,
        headingDeg: s.true_track ?? 0,
        speedKts: s.velocity ? Math.round(s.velocity * 1.944) : 250,
      }));
  } catch {
    return [];
  }
}

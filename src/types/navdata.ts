// filepath: src/types/navdata.ts
export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'fix' | 'vor' | 'ndb' | 'apt';
}

export interface STARLeg {
  waypointId: string;
  altRestrictionFt?: number;
  speedRestrictionKts?: number;
}

export interface STAR {
  id: string;
  icao: string;
  runway: string;   // e.g. "25L" or "ALL"
  waypoints: Waypoint[];
  legs: STARLeg[];
}

export interface NavDatabase {
  waypoints: Record<string, Waypoint>;
  stars: STAR[];
}

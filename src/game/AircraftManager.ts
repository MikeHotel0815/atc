// filepath: src/game/AircraftManager.ts
import type { Aircraft, ATCCommand, ConflictPair } from '@/types/aircraft';
import type { Airport } from '@/types/airport';
import { createAircraft, updateAircraft } from './Aircraft';
import { distanceNM } from '@/utils/geo';
import { destinationPoint } from '@/utils/geo';
import {
  SEP_LATERAL_NM, SEP_VERTICAL_FT,
  WARN_LATERAL_NM, WARN_VERTICAL_FT,
  SPAWN_DISTANCE_NM, MAX_AIRCRAFT,
  AIRCRAFT_TYPES, CALLSIGN_PREFIXES,
  SPAWN_INTERVAL_MIN_S, SPAWN_INTERVAL_MAX_S,
} from './constants';

type EventType = 'landing' | 'goaround' | 'conflict' | 'warning' | 'clear';
type EventHandler = (event: { type: EventType; callsign?: string; pair?: ConflictPair }) => void;

export class AircraftManager {
  private aircraft: Map<string, Aircraft> = new Map();
  private airport: Airport | null = null;
  private listeners: EventHandler[] = [];
  private nextSpawnIn: number;
  private usedCallsigns = new Set<string>();
  // ATC reaction delay: pilot reads back, then acts (5–12 s)
  private pendingCommands: Array<{ id: string; cmd: ATCCommand; executeAt: number }> = [];
  // Track active conflict/warning pairs to emit clear on resolution
  private activePairs = new Map<string, 'conflict' | 'warning'>(); // key: sorted ids

  constructor() {
    this.nextSpawnIn = this.randomSpawnInterval();
  }

  private randomSpawnInterval(): number {
    return (
      SPAWN_INTERVAL_MIN_S +
      Math.random() * (SPAWN_INTERVAL_MAX_S - SPAWN_INTERVAL_MIN_S)
    );
  }

  setAirport(airport: Airport): void {
    this.airport = airport;
  }

  on(handler: EventHandler): void {
    this.listeners.push(handler);
  }

  private emit(event: Parameters<EventHandler>[0]): void {
    this.listeners.forEach((h) => h(event));
  }

  getAll(): Aircraft[] {
    return Array.from(this.aircraft.values());
  }

  get(id: string): Aircraft | undefined {
    return this.aircraft.get(id);
  }

  applyCommand(id: string, cmd: ATCCommand): void {
    // Queue with realistic pilot reaction delay (5–12 s)
    const delaySec = 5 + Math.random() * 7;
    this.pendingCommands.push({ id, cmd, executeAt: performance.now() + delaySec * 1000 });
  }

  private executeCommand(id: string, cmd: ATCCommand): void {
    const ac = this.aircraft.get(id);
    if (!ac) return;
    let updated = { ...ac };
    switch (cmd.type) {
      case 'heading':
        updated = { ...updated, targetHeading: cmd.value, turnDirection: cmd.turnDirection, state: ac.state === 'enroute' ? 'vectored' : ac.state };
        break;
      case 'altitude':
        updated = { ...updated, targetAltitude: cmd.value };
        break;
      case 'speed':
        updated = { ...updated, targetSpeed: cmd.value };
        break;
      case 'ils': {
        const runway = this.airport?.runways.find((r) => r.id === cmd.runwayId);
        if (runway) {
          updated = {
            ...updated,
            clearedILS: true,
            assignedRunway: cmd.runwayId,
            state: ac.state === 'enroute' || ac.state === 'vectored' ? 'vectored' : ac.state,
          };
        }
        break;
      }
    }
    this.aircraft.set(id, updated);
  }

  update(dt: number, now: number): void {
    if (!this.airport) return;

    // Execute due pending commands
    const nowMs = performance.now();
    const due = this.pendingCommands.filter((c) => c.executeAt <= nowMs);
    this.pendingCommands  = this.pendingCommands.filter((c) => c.executeAt >  nowMs);
    for (const { id, cmd } of due) this.executeCommand(id, cmd);

    // Spawn timer
    this.nextSpawnIn -= dt;
    if (this.nextSpawnIn <= 0 && this.aircraft.size < MAX_AIRCRAFT) {
      this.spawnAircraft();
      this.nextSpawnIn = this.randomSpawnInterval();
    }

    // Update all aircraft
    for (const [id, ac] of this.aircraft) {
      const runway = ac.assignedRunway
        ? this.airport.runways.find((r) => r.id === ac.assignedRunway)
        : undefined;
      const { updated, remove } = updateAircraft(ac, dt, now, runway);
      if (remove) {
        this.aircraft.delete(id);
        // Clean up activePairs for removed aircraft
        for (const key of this.activePairs.keys()) {
          if (key.includes(id)) this.activePairs.delete(key);
        }
        if (updated.state === 'landed') {
          this.emit({ type: 'landing', callsign: updated.callsign });
        } else if (updated.state === 'goaround') {
          this.emit({ type: 'goaround', callsign: updated.callsign });
        }
      } else {
        this.aircraft.set(id, updated);
      }
    }

    this.checkSeparation();
  }

  private checkSeparation(): void {
    const list = Array.from(this.aircraft.values());
    // Track which pairs are currently active this frame
    const currentPairs = new Set<string>();

    for (let i = 0; i < list.length; i++) {
      let conflictI = false;
      let warningI = false;
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const lat = distanceNM(a.lat, a.lng, b.lat, b.lng);
        const vert = Math.abs(a.altitudeFt - b.altitudeFt);
        const key = [a.id, b.id].sort().join(':');

        const isConflict = lat < SEP_LATERAL_NM && vert < SEP_VERTICAL_FT;
        const isWarning = !isConflict && lat < WARN_LATERAL_NM && vert < WARN_VERTICAL_FT;

        if (isConflict) {
          conflictI = true;
          currentPairs.add(key);
          const bUpdated = this.aircraft.get(b.id);
          if (bUpdated) this.aircraft.set(b.id, { ...bUpdated, conflict: true, warning: false });
          if (this.activePairs.get(key) !== 'conflict') {
            this.activePairs.set(key, 'conflict');
            this.emit({ type: 'conflict', pair: { a: a.id, b: b.id, type: 'conflict', lateralNM: lat, verticalFt: vert } });
          }
        } else if (isWarning) {
          warningI = true;
          currentPairs.add(key);
          const bUpdated = this.aircraft.get(b.id);
          if (bUpdated) this.aircraft.set(b.id, { ...bUpdated, conflict: false, warning: true });
          if (!this.activePairs.has(key)) {
            this.activePairs.set(key, 'warning');
            this.emit({ type: 'warning', pair: { a: a.id, b: b.id, type: 'warning', lateralNM: lat, verticalFt: vert } });
          } else if (this.activePairs.get(key) === 'conflict') {
            // downgrade conflict → warning
            this.activePairs.set(key, 'warning');
            this.emit({ type: 'warning', pair: { a: a.id, b: b.id, type: 'warning', lateralNM: lat, verticalFt: vert } });
          }
        } else {
          const bUpdated = this.aircraft.get(b.id);
          if (bUpdated) this.aircraft.set(b.id, { ...bUpdated, conflict: false, warning: false });
        }
      }
      const aUpdated = this.aircraft.get(list[i].id);
      if (aUpdated) {
        this.aircraft.set(list[i].id, { ...aUpdated, conflict: conflictI, warning: warningI && !conflictI });
      }
    }

    // Emit clear for pairs no longer active
    for (const [key, _] of this.activePairs) {
      if (!currentPairs.has(key)) {
        const [aId, bId] = key.split(':');
        this.activePairs.delete(key);
        this.emit({ type: 'clear', pair: { a: aId, b: bId, type: 'warning', lateralNM: 0, verticalFt: 0 } });
      }
    }
  }

  private spawnAircraft(): void {
    if (!this.airport) return;
    const types = Object.keys(AIRCRAFT_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const typeData = AIRCRAFT_TYPES[type];
    const callsign = this.generateCallsign();
    const { lat, lng } = this.randomEntryPoint();
    const id = `${callsign}-${Date.now()}`;

    const ac = createAircraft({
      id,
      callsign,
      type,
      lat,
      lng,
      altitudeFt: 8000 + Math.floor(Math.random() * 4000),
      headingDeg: Math.floor(Math.random() * 360),
      speedKts: typeData.cruiseKts,
      verticalSpeedFpm: 0,
      targetHeading: Math.floor(Math.random() * 360),
      targetAltitude: 8000 + Math.floor(Math.random() * 4000),
      targetSpeed: typeData.cruiseKts,
      state: 'enroute',
      clearedILS: false,
    });

    this.aircraft.set(id, ac);
  }

  private randomEntryPoint(): { lat: number; lng: number } {
    if (!this.airport) return { lat: 0, lng: 0 };
    // Spawn on one of 4 cardinal gates
    const bearings = [0, 90, 180, 270];
    const bearing = bearings[Math.floor(Math.random() * bearings.length)];
    const offset = (Math.random() - 0.5) * 20; // ±10° variation
    return destinationPoint(
      this.airport.lat, this.airport.lng,
      bearing + offset,
      SPAWN_DISTANCE_NM
    );
  }

  private generateCallsign(): string {
    let callsign: string;
    let attempts = 0;
    do {
      const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
      const num = Math.floor(100 + Math.random() * 900);
      callsign = `${prefix}${num}`;
      attempts++;
    } while (this.usedCallsigns.has(callsign) && attempts < 50);
    this.usedCallsigns.add(callsign);
    return callsign;
  }

  /** Returns command types currently queued (reaction delay) for an aircraft */
  getPendingTypes(aircraftId: string): Set<ATCCommand['type']> {
    const out = new Set<ATCCommand['type']>();
    for (const c of this.pendingCommands) {
      if (c.id === aircraftId) out.add(c.cmd.type);
    }
    return out;
  }

  exportAircraft(): Aircraft[] {
    return Array.from(this.aircraft.values());
  }

  exportPendingCommands(): Array<{ id: string; cmd: ATCCommand; remainingMs: number }> {
    const now = performance.now();
    return this.pendingCommands
      .filter((c) => c.executeAt > now)
      .map((c) => ({ id: c.id, cmd: c.cmd, remainingMs: c.executeAt - now }));
  }

  importAircraft(aircraft: Aircraft[]): void {
    this.aircraft.clear();
    for (const ac of aircraft) {
      // Clear trails: rAF timestamps from prior session are incompatible with new session's now
      this.aircraft.set(ac.id, { ...ac, trail: [], conflict: false, warning: false });
      this.usedCallsigns.add(ac.callsign);
    }
  }

  importPendingCommands(commands: Array<{ id: string; cmd: ATCCommand; remainingMs: number }>): void {
    const now = performance.now();
    this.pendingCommands = commands.map((c) => ({ id: c.id, cmd: c.cmd, executeAt: now + c.remainingMs }));
  }

  /** Force-spawn for testing/demo */
  forceSpawn(): void {
    this.spawnAircraft();
  }
}

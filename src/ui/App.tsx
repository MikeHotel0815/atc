// filepath: src/ui/App.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, type GameState, type SessionData, type DisplayOptions } from '@/game/GameEngine';
import { DEFAULT_DISPLAY } from '@/game/RadarRenderer';
import { fetchAirportData, AVAILABLE_AIRPORTS } from '@/services/AirportDataService';
import type { Airport } from '@/types/airport';
import type { ATCCommand, Aircraft } from '@/types/aircraft';
import { RadarCanvas } from './RadarCanvas';
import { AircraftStrip } from './AircraftStrip';
import { CommandPanel } from './CommandPanel';
import { AlertBanner } from './AlertBanner';
import { ScorePanel } from './ScorePanel';
import { ContextMenu, type ContextMenuState } from './ContextMenu';

const SIDEBAR_W = 288;
const MOBILE_BREAKPOINT = 700;
const RANGE_PRESETS = [10, 20, 40, 80, 120];

export function App() {
  const engineRef = useRef<GameEngine | null>(null);
  const pendingSessionRef = useRef<SessionData | null>(GameEngine.loadSession());
  const selectedIcaoRef = useRef('EDDF');
  const [gameState, setGameState] = useState<GameState>({
    score: 0, landings: 0, violations: 0,
    aircraft: [], conflicts: [], selectedId: null,
    paused: false, timeScale: 1, sweepEnabled: false, rangeNM: 80, trailLength: 6,
    pendingCmdTypes: {}, display: { ...DEFAULT_DISPLAY },
    activeRunwayIds: [],
  });
  const [airport, setAirport] = useState<Airport | null>(null);
  const [selectedIcao, setSelectedIcao] = useState(() => pendingSessionRef.current?.icao ?? 'EDDF');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const engine = new GameEngine((s) => setGameState({ ...s }));
    engineRef.current = engine;
    engine.start();
    // Auto-save every 10 seconds
    const saveId = setInterval(() => {
      engine.saveSession(selectedIcaoRef.current);
    }, 10_000);
    return () => { engine.stop(); clearInterval(saveId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    selectedIcaoRef.current = selectedIcao;
    setLoading(true);
    fetchAirportData(selectedIcao).then(({ airport: ap, waypoints: wps, stars }) => {
      setAirport(ap);
      const engine = engineRef.current;
      if (!engine) return;
      engine.setAirport(ap, wps, stars);
      // Restore session after airport is set (so aircraft are in known airspace)
      if (pendingSessionRef.current) {
        engine.restoreSession(pendingSessionRef.current);
        pendingSessionRef.current = null;
      }
      setLoading(false);
    });
  }, [selectedIcao]);

  const handleCommand = useCallback((id: string, cmd: ATCCommand) => {
    engineRef.current?.applyCommand(id, cmd);
  }, []);

  const handleSelectAircraft = useCallback((id: string | null) => {
    engineRef.current?.selectAircraft(id);
    if (id && isMobile) setBottomOpen(true);
  }, [isMobile]);

  const handleContextMenu = useCallback((ac: Aircraft, x: number, y: number) => {
    setContextMenu({ x, y, aircraft: ac });
    setGameState((prev) => ({ ...prev, selectedId: ac.id }));
    engineRef.current?.selectAircraft(ac.id);
  }, []);

  const handleHeadingPreview = useCallback((aircraftId: string, targetHdg: number | null, direction?: 'left' | 'right') => {
    engineRef.current?.setPreviewHeading(targetHdg !== null ? aircraftId : null, targetHdg, direction);
  }, []);

  const handleAltitudePreview = useCallback((aircraftId: string, alt: number | null) => {
    engineRef.current?.setPreviewAltitude(alt !== null ? aircraftId : null, alt);
  }, []);

  const selected = gameState.aircraft.find((a) => a.id === gameState.selectedId);

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{
      width: isMobile ? '100%' : SIDEBAR_W,
      minWidth: isMobile ? undefined : SIDEBAR_W,
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: 10,
      background: '#080f0a',
      borderLeft: isMobile ? 'none' : '1px solid #0a2010',
      borderTop: isMobile ? '1px solid #0a2010' : 'none',
      overflowY: 'auto',
      maxHeight: isMobile ? '60vh' : undefined,
    }}>

      {/* Airport selector */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <label style={{ color: '#446644', fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap' }}>AIRPORT</label>
        <select
          value={selectedIcao}
          onChange={(e) => setSelectedIcao(e.target.value)}
          style={{ background: '#0a1a0a', border: '1px solid #1a4428', color: '#00ff88', fontFamily: '"Courier New", monospace', fontSize: 12, padding: '3px 6px', flex: 1, outline: 'none' }}
        >
          {AVAILABLE_AIRPORTS.map((icao) => <option key={icao} value={icao}>{icao}</option>)}
        </select>
        {loading && <span style={{ color: '#446644', fontSize: 10 }}>LOAD</span>}
      </div>

      {/* Active landing runway */}
      {airport && (() => {
        const ilsRunways = airport.runways.filter((r) => r.ils && r.role !== 'departure');
        if (ilsRunways.length === 0) return null;
        return (
          <div>
            <div style={{ color: '#446644', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>ACTIVE RWY</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {ilsRunways.map((rwy) => {
                const isActive = gameState.activeRunwayIds.includes(rwy.id);
                return (
                  <button
                    key={rwy.id}
                    onClick={() => engineRef.current?.toggleActiveRunway(rwy.id)}
                    style={{
                      flex: '1 0 auto',
                      background: isActive ? '#0a3020' : 'transparent',
                      border: `1px solid ${isActive ? '#00cc66' : '#1a4428'}`,
                      color: isActive ? '#00ff88' : '#446644',
                      fontFamily: '"Courier New", monospace',
                      fontSize: 11,
                      padding: '4px 6px',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >
                    {rwy.id}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Range selector */}
      <div>
        <div style={{ color: '#446644', fontSize: 10, letterSpacing: 1, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span>RANGE</span>
          <span style={{ color: '#00ff88' }}>{Math.round(gameState.rangeNM)} NM</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {RANGE_PRESETS.map((nm) => (
            <button
              key={nm}
              onClick={() => engineRef.current?.setRange(nm)}
              style={{
                flex: 1,
                background: Math.round(gameState.rangeNM) === nm ? '#0a3020' : 'transparent',
                border: `1px solid ${Math.round(gameState.rangeNM) === nm ? '#00cc66' : '#1a4428'}`,
                color: Math.round(gameState.rangeNM) === nm ? '#00ff88' : '#446644',
                fontFamily: '"Courier New", monospace',
                fontSize: 11,
                padding: '4px 2px',
                cursor: 'pointer',
                borderRadius: 2,
              }}
            >
              {nm}
            </button>
          ))}
        </div>
        <button
          onClick={() => engineRef.current?.resetView()}
          style={{
            width: '100%', marginTop: 3,
            background: 'transparent', border: '1px solid #1a4428',
            color: '#446644', fontFamily: '"Courier New", monospace',
            fontSize: 10, padding: '3px 0', cursor: 'pointer', borderRadius: 2,
          }}
        >
          RESET VIEW
        </button>
      </div>

      {/* Trail length slider */}
      <div>
        <div style={{ color: '#446644', fontSize: 10, letterSpacing: 1, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span>TRAIL</span>
          <span style={{ color: '#00ff88' }}>{gameState.trailLength}</span>
        </div>
        <input
          type="range" min={0} max={20} step={1}
          value={gameState.trailLength}
          onChange={(e) => engineRef.current?.setTrailLength(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#00cc66', cursor: 'pointer' }}
        />
      </div>

      {/* Alerts */}
      <AlertBanner conflicts={gameState.conflicts} aircraft={gameState.aircraft} />

      {/* Traffic strips */}
      <div style={{ color: '#446644', fontSize: 10, letterSpacing: 1 }}>
        TRAFFIC ({gameState.aircraft.filter((a) => a.state !== 'landed').length})
      </div>
      <AircraftStrip aircraft={gameState.aircraft} selectedId={gameState.selectedId} onSelect={handleSelectAircraft} />

      {/* Commands */}
      <div style={{ color: '#446644', fontSize: 10, letterSpacing: 1 }}>COMMANDS</div>
      <CommandPanel selected={selected} airport={airport} onCommand={handleCommand} />

      {/* Score / controls */}
      <ScorePanel
        score={gameState.score} landings={gameState.landings} violations={gameState.violations}
        paused={gameState.paused} timeScale={gameState.timeScale} sweepEnabled={gameState.sweepEnabled}
        onPause={() => engineRef.current?.pause()}
        onResume={() => engineRef.current?.resume()}
        onToggleSweep={() => engineRef.current?.setSweep(!gameState.sweepEnabled)}
        onTimeScale={(s) => engineRef.current?.setTimeScale(s)}
      />
    </div>
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', fontFamily: '"Courier New", Courier, monospace' }}>

      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#050e05', borderBottom: '1px solid #0a2010', flexShrink: 0 }}>
          <span style={{ color: '#00cc66', fontSize: 13, fontWeight: 'bold' }}>ATC APPROACH</span>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#446644' }}>
            <span style={{ color: gameState.score >= 0 ? '#00ff88' : '#ff3333' }}>{gameState.score}</span>
            <span>{gameState.landings} LND</span>
            <button onClick={() => setBottomOpen((o) => !o)} style={{ background: bottomOpen ? '#0a2a18' : 'transparent', border: '1px solid #1a4428', color: '#00cc66', padding: '2px 8px', fontFamily: '"Courier New", monospace', fontSize: 11, cursor: 'pointer', borderRadius: 2 }}>
              {bottomOpen ? '▲ RADAR' : '▼ CTRL'}
            </button>
          </div>
        </div>
      )}

      {(!isMobile || !bottomOpen) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <RadarCanvas
            engine={engineRef.current}
            aircraft={gameState.aircraft}
            selectedId={gameState.selectedId}
            onSelectAircraft={handleSelectAircraft}
            onContextMenu={handleContextMenu}
          />
          <DisplayBar display={gameState.display} onChange={(patch) => engineRef.current?.setDisplay(patch)} />
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          menu={contextMenu} airport={airport}
          onCommand={handleCommand}
          onClose={() => { setContextMenu(null); engineRef.current?.setPreviewHeading(null, null); engineRef.current?.setPreviewAltitude(null, null); }}
          onHeadingPreview={handleHeadingPreview}
          onAltitudePreview={handleAltitudePreview}
          pendingCmdTypes={gameState.pendingCmdTypes[contextMenu.aircraft.id] ?? []}
          activeRunwayIds={gameState.activeRunwayIds}
        />
      )}

      {(!isMobile || bottomOpen) && sidebar}
    </div>
  );
}

// ── Display toggle bar ────────────────────────────────────────────────────────
const DISPLAY_TOGGLES: { key: keyof DisplayOptions; label: string }[] = [
  { key: 'labels',   label: 'LABELS'  },
  { key: 'ilsCones', label: 'ILS'     },
  { key: 'waypoints',label: 'NAVAID'  },
  { key: 'stars',    label: 'STARs'   },
];

function DisplayBar({ display, onChange }: { display: DisplayOptions; onChange: (patch: Partial<DisplayOptions>) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '4px 8px',
      background: '#050e05', borderTop: '1px solid #0a2010',
      flexShrink: 0,
    }}>
      {DISPLAY_TOGGLES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange({ [key]: !display[key] })}
          style={{
            background: display[key] ? '#0a3020' : 'transparent',
            border: `1px solid ${display[key] ? '#00cc66' : '#1a4428'}`,
            color: display[key] ? '#00ff88' : '#446644',
            fontFamily: '"Courier New", monospace',
            fontSize: 10,
            padding: '2px 8px',
            cursor: 'pointer',
            borderRadius: 2,
            letterSpacing: 1,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

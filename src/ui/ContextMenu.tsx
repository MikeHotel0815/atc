// filepath: src/ui/ContextMenu.tsx
import { useEffect, useRef, useState } from 'react';
import type { Aircraft, ATCCommand } from '@/types/aircraft';
import type { Airport } from '@/types/airport';
import { getILSStatusForRunway } from '@/game/ILS';
import { normaliseHdg, headingDiff } from '@/utils/aviation';
import { AIRCRAFT_TYPES } from '@/game/constants';

export interface ContextMenuState {
  x: number;
  y: number;
  aircraft: Aircraft;
}

interface Props {
  menu: ContextMenuState;
  airport: Airport | null;
  onCommand: (id: string, cmd: ATCCommand) => void;
  onClose: () => void;
  onHeadingPreview?: (aircraftId: string, hdg: number | null, direction?: 'left' | 'right') => void;
  onAltitudePreview?: (aircraftId: string, alt: number | null) => void;
  pendingCmdTypes?: string[];   // command types queued but not yet executed
  activeRunwayIds?: string[];
}

const MENU_STYLE: React.CSSProperties = {
  position: 'fixed',
  background: '#070f0a',
  border: '1px solid #1a5530',
  borderRadius: 4,
  minWidth: 220,
  zIndex: 1000,
  fontFamily: '"Courier New", monospace',
  fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
  overflow: 'hidden',
};

const SECTION_STYLE: React.CSSProperties = {
  color: '#2a5535',
  fontSize: 10,
  letterSpacing: 1.5,
  padding: '6px 10px 3px',
  borderTop: '1px solid #0a2a15',
  userSelect: 'none',
};

const ITEM_STYLE: React.CSSProperties = {
  padding: '6px 12px',
  cursor: 'pointer',
  color: '#00cc66',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
};

const ITEM_HOVER = '#0d2a18';

export function ContextMenu({ menu, airport, onCommand, onClose, onHeadingPreview, onAltitudePreview, pendingCmdTypes = [], activeRunwayIds = [] }: Props) {
  const { aircraft: ac } = menu;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Show heading arc and altitude circle for active (not yet reached) targets on open
  useEffect(() => {
    const hdgDiff = Math.abs(headingDiff(ac.headingDeg, ac.targetHeading));
    if (hdgDiff > 2) {
      onHeadingPreview?.(ac.id, ac.targetHeading, ac.turnDirection);
    }
    if (Math.abs(ac.altitudeFt - ac.targetAltitude) > 100) {
      onAltitudePreview?.(ac.id, ac.targetAltitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position computed in RadarCanvas — clamp to viewport as safety net
  const x = Math.max(4, Math.min(menu.x, window.innerWidth  - 234));
  const y = Math.max(4, Math.min(menu.y, window.innerHeight - 424));

  const cmd = (c: ATCCommand) => { onCommand(ac.id, c); onClose(); };
  const typeData = AIRCRAFT_TYPES[ac.type];
  const approachSpd = typeData?.approachKts ?? 140;

  const ilsRunways = airport?.runways.filter((rwy) => {
    if (!rwy.ils) return false;
    if (!activeRunwayIds.includes(rwy.id)) return false;
    return getILSStatusForRunway(ac, rwy).canIntercept;
  }) ?? [];

  return (
    <div ref={ref} style={{ ...MENU_STYLE, left: x, top: y }}>
      {/* Header */}
      <div style={{
        padding: '7px 12px', background: '#0a1f12', color: '#00ff88',
        fontWeight: 'bold', fontSize: 13,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{ac.callsign}</span>
        <span style={{ color: '#446644', fontSize: 11, fontWeight: 'normal' }}>
          {ac.type} · FL{Math.round(ac.altitudeFt / 100).toString().padStart(3, '0')} · {Math.round(ac.speedKts)}kt
        </span>
      </div>

      {/* ── HEADING ── */}
      <div style={SECTION_STYLE}>
        HEADING
        <CmdStatus
          current={`${String(Math.round(ac.headingDeg)).padStart(3,'0')}°`}
          target={`${String(Math.round(ac.targetHeading)).padStart(3,'0')}°`}
          active={Math.abs(ac.headingDeg - ac.targetHeading) > 2 &&
                  Math.abs(((ac.headingDeg - ac.targetHeading + 540) % 360) - 180) > 2}
          pending={pendingCmdTypes.includes('heading')}
          tendency={(() => {
            const d = ((ac.targetHeading - ac.headingDeg + 540) % 360) - 180;
            return d > 0 ? '↻' : '↺';
          })()}
        />
      </div>
      <ScrollableValue
        initial={Math.round(ac.headingDeg)}
        step={1} stepShift={10}
        min={1} max={360} wrap
        format={(v) => `${String(v).padStart(3, '0')}°`}
        unit="HDG"
        onSend={(v, dir) => cmd({ type: 'heading', value: v, turnDirection: dir })}
        onPreviewDelta={(d) => {
          if (d === null) { onHeadingPreview?.(ac.id, null); return; }
          const absHdg = normaliseHdg(Math.round(ac.headingDeg) + d);
          const dir = d > 0 ? 'right' : d < 0 ? 'left' : undefined;
          onHeadingPreview?.(ac.id, absHdg, dir);
        }}
      />
      <div style={{ display: 'flex' }}>
        {([-30, -90, 90, 30] as const).map((delta) => (
          <HoverItem
            key={delta}
            style={{ ...ITEM_STYLE, flex: 1, justifyContent: 'center', fontSize: 11, padding: '5px 4px' }}
            hoverBg={ITEM_HOVER}
            onClick={() => cmd({ type: 'heading', value: normaliseHdg(ac.headingDeg + delta), turnDirection: delta > 0 ? 'right' : 'left' })}
          >
            {delta > 0 ? `R${delta}°` : `L${Math.abs(delta)}°`}
          </HoverItem>
        ))}
      </div>

      {/* ── ALTITUDE ── */}
      <div style={SECTION_STYLE}>
        ALTITUDE
        <CmdStatus
          current={`FL${String(Math.round(ac.altitudeFt / 100)).padStart(3, '0')}`}
          target={`FL${String(Math.round(ac.targetAltitude / 100)).padStart(3, '0')}`}
          active={Math.abs(ac.altitudeFt - ac.targetAltitude) > 100}
          pending={pendingCmdTypes.includes('altitude')}
          tendency={ac.targetAltitude > ac.altitudeFt ? '▲' : '▼'}
        />
      </div>
      <ScrollableValue
        initial={Math.round(ac.altitudeFt / 100) * 100}
        step={100} stepShift={1000}
        min={0} max={41000}
        format={(v) => `FL${String(v / 100).padStart(3, '0')}`}
        unit="ALT"
        onSend={(v) => cmd({ type: 'altitude', value: v })}
        onPreview={(v) => onAltitudePreview?.(ac.id, v)}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {[10000, 8000, 6000, 4000, 2000].map((alt) => (
          <HoverItem
            key={alt}
            style={{ ...ITEM_STYLE, flex: '0 0 33%', justifyContent: 'center', fontSize: 11, padding: '5px 4px' }}
            hoverBg={ITEM_HOVER}
            onClick={() => cmd({ type: 'altitude', value: alt })}
          >
            FL{String(alt / 100).padStart(3, '0')}
          </HoverItem>
        ))}
      </div>

      {/* ── SPEED ── */}
      <div style={SECTION_STYLE}>
        SPEED
        <CmdStatus
          current={`${Math.round(ac.speedKts)}kt`}
          target={`${Math.round(ac.targetSpeed)}kt`}
          active={Math.abs(ac.speedKts - ac.targetSpeed) > 5}
          pending={pendingCmdTypes.includes('speed')}
          tendency={ac.targetSpeed > ac.speedKts ? '▲' : '▼'}
        />
      </div>
      <ScrollableValue
        initial={Math.round(ac.speedKts)}
        step={5} stepShift={10}
        min={80} max={350}
        format={(v) => `${v} kt`}
        unit="SPD"
        onSend={(v) => cmd({ type: 'speed', value: v })}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {[280, 250, 220, 180, approachSpd].map((spd) => (
          <HoverItem
            key={spd}
            style={{ ...ITEM_STYLE, flex: '0 0 33%', justifyContent: 'center', fontSize: 11, padding: '5px 4px' }}
            hoverBg={ITEM_HOVER}
            onClick={() => cmd({ type: 'speed', value: spd })}
          >
            {spd}kt
          </HoverItem>
        ))}
      </div>

      {/* ── ILS ── */}
      {(ac.clearedILS || ilsRunways.length > 0 || pendingCmdTypes.includes('ils')) && (
        <>
          <div style={SECTION_STYLE}>
            ILS APPROACH
            {(ac.clearedILS || pendingCmdTypes.includes('ils')) && (
              <span style={{ float: 'right', fontSize: 10, fontWeight: 'normal', letterSpacing: 0,
                color: pendingCmdTypes.includes('ils') ? '#ffaa00' : '#00cc66' }}>
                {pendingCmdTypes.includes('ils') ? '⧖ ' : ''}
                {ac.assignedRunway ? `RWY ${ac.assignedRunway}` : ''}
                {!pendingCmdTypes.includes('ils') && ac.clearedILS ? ' ✓' : ''}
              </span>
            )}
          </div>
          {ilsRunways.map((rwy) => (
            <HoverItem key={rwy.id} style={ITEM_STYLE} hoverBg={ITEM_HOVER}
              onClick={() => cmd({ type: 'ils', runwayId: rwy.id })}>
              <span>Cleared ILS RWY {rwy.id}</span>
              {ac.clearedILS && ac.assignedRunway === rwy.id && (
                <span style={{ color: '#00cc66', fontSize: 10 }}>ACTIVE</span>
              )}
            </HoverItem>
          ))}
        </>
      )}
    </div>
  );
}

// ── Command status indicator ─────────────────────────────────────────────────
function CmdStatus({ current, target, active, pending, tendency }: {
  current: string; target: string; active: boolean; pending: boolean; tendency: string;
}) {
  if (!active && !pending) return null;
  return (
    <span style={{ float: 'right', fontSize: 10, color: pending ? '#ffaa00' : '#00cc66', fontWeight: 'normal', letterSpacing: 0 }}>
      {pending ? '⧖ ' : ''}{current}→{target} {tendency}
    </span>
  );
}

// ── Generic scrollable value spinbox ─────────────────────────────────────────
// Interaction: 1st click → activate (scroll to adjust) · 2nd click → send
interface ScrollableValueProps {
  initial: number;
  step: number;
  stepShift: number;
  min: number;
  max: number;
  wrap?: boolean;
  format: (v: number) => string;
  unit: string;
  onSend: (v: number, dir?: 'left' | 'right') => void;
  onPreview?: (v: number | null) => void;
  /** Heading-specific: passes raw accumulated delta (maintains scroll direction, ignores shortest-path) */
  onPreviewDelta?: (delta: number | null) => void;
}

function ScrollableValue({ initial, step, stepShift, min, max, wrap, format, unit, onSend, onPreview, onPreviewDelta }: ScrollableValueProps) {
  const [value, setValue] = useState(initial);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;
  const onPreviewDeltaRef = useRef(onPreviewDelta);
  onPreviewDeltaRef.current = onPreviewDelta;
  // Accumulated raw scroll delta (signed, not wrapped) — used for heading arc direction
  const rawDeltaRef = useRef(0);

  const handleClick = () => {
    if (!active) {
      rawDeltaRef.current = 0;
      setActive(true);
      onPreviewRef.current?.(value);
      onPreviewDeltaRef.current?.(0);
    } else {
      onPreviewRef.current?.(null);
      onPreviewDeltaRef.current?.(null);
      const dir = rawDeltaRef.current > 0 ? 'right' : rawDeltaRef.current < 0 ? 'left' : undefined;
      onSend(value, dir);
    }
  };

  // Notify preview on value change while active
  useEffect(() => {
    if (active) onPreviewRef.current?.(value);
    // onPreviewDelta is fired in the wheel handler directly (has rawDelta)
  }, [value, active]);

  // Clear preview when deactivated externally
  useEffect(() => {
    if (!active) {
      onPreviewRef.current?.(null);
      onPreviewDeltaRef.current?.(null);
    }
  }, [active]);

  // Scroll wheel: activate on first scroll, then adjust
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!active) {
        // Auto-activate from current initial value (reset state to initial first)
        rawDeltaRef.current = 0;
        setValue(initial);
        setActive(true);
        onPreviewRef.current?.(initial);
        onPreviewDeltaRef.current?.(0);
      }
      const s = e.shiftKey ? stepShift : step;
      const d = e.deltaY > 0 ? -s : s;
      rawDeltaRef.current += d;
      setValue((prev) => {
        const next = prev + d;
        if (wrap) return ((next - 1 + 360) % 360) + 1;
        return Math.max(min, Math.min(max, next));
      });
      onPreviewDeltaRef.current?.(rawDeltaRef.current);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [active, initial, step, stepShift, min, max, wrap]);

  // ENTER key sends the value when active
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      onPreviewRef.current?.(null);
      onPreviewDeltaRef.current?.(null);
      const dir = rawDeltaRef.current > 0 ? 'right' : rawDeltaRef.current < 0 ? 'left' : undefined;
      onSend(value, dir);
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
  }, [active, value, onSend]);

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '8px 12px', cursor: 'pointer',
        background: active ? '#0a3020' : 'transparent',
        border: active ? '1px solid #00cc66' : '1px solid transparent',
        margin: '0 4px 2px',
        borderRadius: 3,
        userSelect: 'none',
        transition: 'background 0.1s',
      }}
      title={active ? 'Scroll to adjust · Click to send' : 'Click to activate'}
    >
      <span style={{ color: active ? '#00cc66' : '#2a5535', fontSize: 10 }}>↕</span>
      <span style={{ color: active ? '#00ff88' : '#446655', fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }}>
        {format(value)}
      </span>
      <span style={{ color: active ? '#00cc66' : '#2a5535', fontSize: 10 }}>
        {active ? 'SEND' : unit}
      </span>
    </div>
  );
}

// ── Generic hover item ────────────────────────────────────────────────────────
function HoverItem({
  children, style, hoverBg, onClick,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  hoverBg: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enter = () => (el.style.background = hoverBg);
    const leave = () => (el.style.background = 'transparent');
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    };
  }, [hoverBg]);

  return (
    <div ref={ref} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

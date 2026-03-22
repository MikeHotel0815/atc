// filepath: src/ui/ScorePanel.tsx
interface Props {
  score: number;
  landings: number;
  violations: number;
  paused: boolean;
  sweepEnabled: boolean;
  onPause: () => void;
  onResume: () => void;
  onToggleSweep: () => void;
}

export function ScorePanel({ score, landings, violations, paused, sweepEnabled, onPause, onResume, onToggleSweep }: Props) {
  return (
    <div style={{ borderTop: '1px solid #1a3a1a', paddingTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 4 }}>
        <span style={{ color: '#446644', fontSize: 10, letterSpacing: 1 }}>SESSION</span>
        <button
          onClick={onToggleSweep}
          style={{
            background: sweepEnabled ? '#0a2a18' : 'transparent',
            border: '1px solid #335533',
            color: sweepEnabled ? '#00cc66' : '#446644',
            padding: '2px 6px',
            fontFamily: '"Courier New", monospace',
            fontSize: 10,
            cursor: 'pointer',
            borderRadius: 2,
          }}
        >
          SWEEP
        </button>
        <button
          onClick={paused ? onResume : onPause}
          style={{
            background: 'transparent',
            border: '1px solid #335533',
            color: '#446644',
            padding: '2px 8px',
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
            cursor: 'pointer',
            borderRadius: 2,
          }}
        >
          {paused ? '▶' : '⏸'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        <Stat label="SCORE" value={score.toString()} color={score >= 0 ? '#00ff88' : '#ff3333'} />
        <Stat label="LANDED" value={landings.toString()} color="#00ff88" />
        <Stat label="VIOL." value={violations.toString()} color={violations > 0 ? '#ff3333' : '#446644'} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#335533', fontSize: 9, letterSpacing: 1 }}>{label}</div>
      <div style={{ color, fontSize: 16, fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

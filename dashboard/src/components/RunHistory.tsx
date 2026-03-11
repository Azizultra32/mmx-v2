import { useDashboard } from '../context/DashboardContext';

const STATE_COLOR: Record<string, string> = {
  COMPLETE: 'var(--green)',
  FAILED: 'var(--red)',
  INITIALIZED: 'var(--dim)',
  CATHEDRALED: 'var(--blue)',
  RUNNING: 'var(--yellow)',
};

export function RunHistory() {
  const { runs, targetName, selectedRunId, setSelectedRunId } = useDashboard();

  return (
    <div className="panel">
      <div className="panel-title">Mission History</div>
      {runs.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 13, lineHeight: 1.8 }}>
          No missions recorded for <span style={{ color: 'var(--blue)' }}>{targetName}</span> yet.
          <br />Launch one above to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {runs.map((run) => {
            const active = run.runId === selectedRunId;
            const stateColor = STATE_COLOR[run.state] ?? 'var(--dim)';
            return (
              <button
                key={run.runId}
                onClick={() => setSelectedRunId(active ? null : run.runId)}
                style={{
                  textAlign: 'left',
                  background: active ? 'rgba(88,166,255,0.08)' : 'var(--bg3)',
                  border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: 4,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontFamily: 'var(--font)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{run.runId}</span>
                  <span style={{ fontSize: 12, color: stateColor, fontWeight: 700 }}>{run.state}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                  Level {run.level} · ${run.totalCostUsd.toFixed(4)}
                  {run.updatedAt && <span> · {new Date(run.updatedAt).toLocaleString()}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

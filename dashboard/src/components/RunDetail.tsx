import { useDashboard } from '../context/DashboardContext';

export function RunDetail() {
  const { runs, selectedRunId, targetName } = useDashboard();
  const run = runs.find(r => r.runId === selectedRunId);

  if (!selectedRunId || !run) {
    return (
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="panel-title">Mission Detail</div>
        <div style={{ color: 'var(--blue)', fontSize: 24, fontWeight: 800 }}>{targetName}</div>
        <div style={{ color: 'var(--text)', fontSize: 14 }}>
          Select a mission from history, or launch a new one.
        </div>
        <div style={{ color: 'var(--dim)', fontSize: 12, lineHeight: 1.7 }}>
          MMX v2 — contract-driven execution engine<br />
          Pipeline: Cathedral → Find → Distill → Predict → Propose → Implement → Final Guard
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Mission Detail</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{run.runId}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: run.state === 'COMPLETE' ? 'var(--green)' : run.state === 'FAILED' ? 'var(--red)' : 'var(--blue)' }}>
            {run.state}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Level', String(run.level)],
            ['Cost', `$${run.totalCostUsd.toFixed(4)}`],
            ['Created', run.createdAt ? new Date(run.createdAt).toLocaleString() : '—'],
            ['Updated', run.updatedAt ? new Date(run.updatedAt).toLocaleString() : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--bg3)', padding: '8px 12px', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
            </div>
          ))}
        </div>
        {run.error && (
          <div style={{ padding: '10px 12px', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 4, fontSize: 12, color: 'var(--red)' }}>
            {run.error}
          </div>
        )}
      </div>
    </div>
  );
}

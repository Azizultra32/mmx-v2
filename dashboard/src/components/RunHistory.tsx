import { useDashboard } from '../context/DashboardContext';

const STATE_CLASS: Record<string, string> = {
  pending:  'state-pending',
  running:  'state-running',
  complete: 'state-complete',
  failed:   'state-failed',
};

function shortId(id: string): string {
  // e.g. "run-1234567890" → "run-1234567890" or truncate long UUIDs
  return id.length > 24 ? `…${id.slice(-20)}` : id;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function RunHistory() {
  const { runs, selectedRunId, setSelectedRunId } = useDashboard();

  return (
    <div className="run-history">
      <h3>Run History</h3>
      {runs.length === 0 && (
        <div style={{ color: 'var(--dim)', padding: '8px 4px' }}>No runs yet</div>
      )}
      {runs.map(run => (
        <div
          key={run.run_id}
          className={`run-item ${run.run_id === selectedRunId ? 'selected' : ''}`}
          onClick={() => setSelectedRunId(run.run_id)}
        >
          <div className="run-item-id">{shortId(run.run_id)}</div>
          <div className="run-item-meta">
            <span className={`header-state ${STATE_CLASS[run.state] ?? 'state-pending'}`}>
              {run.state}
            </span>
            <span style={{ color: 'var(--dim)' }}>L{run.level}</span>
            <span className="run-cost">${run.total_cost_usd.toFixed(4)}</span>
          </div>
          <div style={{ color: 'var(--dim)', fontSize: '10px', marginTop: '2px' }}>
            {formatDate(run.updated_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

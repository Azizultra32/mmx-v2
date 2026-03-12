import { useDashboard } from '../context/DashboardContext';
import type { RunState } from '../context/DashboardContext';

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function RunItem({ run, selected, onClick }: { run: RunState; selected: boolean; onClick: () => void }) {
  return (
    <div className={`run-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="run-id">{run.run_id}</div>
      <div className="run-meta">
        <span className={`run-state ${run.state}`}>{run.state}</span>
        <span>${run.total_cost_usd.toFixed(4)}</span>
        <span>{timeSince(run.created_at)}</span>
      </div>
    </div>
  );
}

export function RunHistory() {
  const { runs, selectedRunId, setSelectedRunId } = useDashboard();

  return (
    <div className="run-history">
      <h3>Run History</h3>
      {runs.length === 0 && <div className="empty-state">No runs yet</div>}
      {runs.map(run => (
        <RunItem
          key={run.run_id}
          run={run}
          selected={run.run_id === selectedRunId}
          onClick={() => setSelectedRunId(run.run_id)}
        />
      ))}
    </div>
  );
}

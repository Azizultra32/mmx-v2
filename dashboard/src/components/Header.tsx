import { useDashboard } from '../context/DashboardContext';

export function Header() {
  const { selectedRun } = useDashboard();

  const stateClass = selectedRun
    ? `state-${selectedRun.state}`
    : 'state-pending';

  const targetName = selectedRun
    ? selectedRun.target_path.split('/').pop() ?? selectedRun.target_path
    : '—';

  return (
    <div className="header">
      <span className="header-title">MMX v2</span>
      <span className="header-target">{targetName}</span>
      {selectedRun && (
        <span className={`header-state ${stateClass}`}>
          {selectedRun.state.toUpperCase()}
        </span>
      )}
    </div>
  );
}

import { useDashboard } from '../context/DashboardContext';

export function CostBreakdown() {
  const { selectedRun } = useDashboard();

  const cost = selectedRun?.total_cost_usd ?? 0;
  const isDry = cost === 0;

  return (
    <div className="cost-breakdown">
      <h3>Cost Breakdown</h3>
      {!selectedRun ? (
        <div className="cost-dry">—</div>
      ) : isDry ? (
        <div className="cost-dry">dryRun / no cost</div>
      ) : (
        <div className="cost-value">${cost.toFixed(4)}</div>
      )}
    </div>
  );
}

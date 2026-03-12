import { useDashboard } from '../context/DashboardContext';

export function CostBreakdown() {
  const { runs, selectedRun } = useDashboard();
  const total = runs.reduce((sum, r) => sum + r.total_cost_usd, 0);

  return (
    <div className="cost-breakdown">
      <h3>Cost</h3>
      {selectedRun && (
        <div style={{ marginBottom: 6 }}>
          <div className="cost-total">${selectedRun.total_cost_usd.toFixed(4)}</div>
          <div className="cost-usd">this run</div>
        </div>
      )}
      <div className="cost-total" style={{ fontSize: 13 }}>${total.toFixed(4)}</div>
      <div className="cost-usd">all time ({runs.length} runs)</div>
    </div>
  );
}

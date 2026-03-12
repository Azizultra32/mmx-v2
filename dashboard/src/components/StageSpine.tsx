import { useDashboard } from '../context/DashboardContext';

const STAGES = [
  'cathedral', 'find', 'distill', 'predict',
  'propose', 'implement', 'finalguard', 'humangate',
] as const;

type StageStatus = 'pending' | 'running' | 'complete' | 'failed';

function getStageStatus(
  stageName: string,
  activeStage: string | null,
  runState: string,
): StageStatus {
  if (!activeStage) {
    if (runState === 'COMPLETE') return 'complete';
    if (runState === 'FAILED') return 'failed';
    return 'pending';
  }
  const order = STAGES as readonly string[];
  const activeIdx = order.indexOf(activeStage.toLowerCase());
  const thisIdx = order.indexOf(stageName);

  if (runState === 'FAILED' && activeStage.toLowerCase() === stageName) return 'failed';
  if (thisIdx < activeIdx) return 'complete';
  if (thisIdx === activeIdx) return 'running';
  return 'pending';
}

export function StageSpine() {
  const { selectedRun } = useDashboard();

  return (
    <div className="stage-spine">
      {STAGES.map(stage => {
        const status: StageStatus = selectedRun
          ? getStageStatus(stage, selectedRun.active_stage, selectedRun.state)
          : 'pending';
        return (
          <div key={stage} className={`stage-item ${status}`}>
            <span className={`stage-dot ${status}`} />
            <span className="stage-name">{stage}</span>
          </div>
        );
      })}
    </div>
  );
}

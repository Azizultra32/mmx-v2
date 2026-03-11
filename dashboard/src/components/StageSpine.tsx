import { useDashboard } from '../context/DashboardContext';

const STAGES = [
  'CATHEDRAL',
  'FIND',
  'DISTILL',
  'PREDICT',
  'PROPOSE',
  'IMPLEMENT',
  'FINALGUARD',
  'HUMANGATE',
] as const;

function stageDot(status: 'pending' | 'running' | 'complete' | 'failed'): string {
  switch (status) {
    case 'running':  return '🔵';
    case 'complete': return '✅';
    case 'failed':   return '❌';
    default:         return '⬜';
  }
}

function stageStatus(
  stageName: string,
  activeStage: string | null,
  runState: string,
): 'pending' | 'running' | 'complete' | 'failed' {
  if (!activeStage) {
    if (runState === 'complete') return 'complete';
    return 'pending';
  }

  const order = STAGES as readonly string[];
  const activeIdx = order.indexOf(activeStage.toUpperCase());
  const thisIdx = order.indexOf(stageName);

  if (runState === 'failed' && activeStage.toUpperCase() === stageName) return 'failed';
  if (thisIdx < activeIdx) return 'complete';
  if (thisIdx === activeIdx) return 'running';
  return 'pending';
}

export function StageSpine() {
  const { selectedRun } = useDashboard();

  return (
    <div className="stage-spine">
      {STAGES.map(stage => {
        const status = selectedRun
          ? stageStatus(stage, selectedRun.active_stage, selectedRun.state)
          : 'pending';
        return (
          <div key={stage} className={`stage-item ${status}`}>
            <span className="stage-dot">{stageDot(status)}</span>
            <span className="stage-name">{stage}</span>
          </div>
        );
      })}
    </div>
  );
}

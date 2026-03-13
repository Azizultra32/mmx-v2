import { createContext, useContext, useEffect, useState } from 'react';

export interface RunState {
  run_id: string;
  target_path: string;
  level: number;
  state: string;
  active_stage: string | null;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface TargetInfo {
  target_id: string;
  display_name: string;
  source_type: 'demo' | 'github' | 'local';
  source_path: string;
  created_at: string;
  run_count?: number;
}

interface DashboardContextValue {
  runs: RunState[];
  selectedRunId: string | null;
  setSelectedRunId: (id: string | null) => void;
  selectedRun: RunState | null;
  targets: TargetInfo[];
  selectedTarget: TargetInfo | null;
  setSelectedTarget: (t: TargetInfo | null) => void;
  refreshTargets: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue>({
  runs: [],
  selectedRunId: null,
  setSelectedRunId: () => {},
  selectedRun: null,
  targets: [],
  selectedTarget: null,
  setSelectedTarget: () => {},
  refreshTargets: async () => {},
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [runs, setRuns] = useState<RunState[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<TargetInfo | null>(null);

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/targets');
      const data = await res.json() as { targets?: TargetInfo[] };
      const list = data.targets ?? [];
      setTargets(list);
      // Auto-select first target if none selected
      setSelectedTarget(prev => {
        if (prev) {
          // Keep existing selection if still present
          const still = list.find(t => t.target_id === prev.target_id);
          return still ?? (list[0] ?? null);
        }
        return list[0] ?? null;
      });
    } catch {
      // server may not be up yet
    }
  };

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch('/api/runs');
        const data = await res.json() as { runs: RunState[] };
        setRuns(data.runs ?? []);
        // Auto-select most recent if none selected
        if (!selectedRunId && data.runs?.length > 0) {
          setSelectedRunId(data.runs[0].run_id);
        }
      } catch {
        // server may not be up yet
      }
    };

    fetchRuns();
    fetchTargets();

    const runsTimer = setInterval(fetchRuns, 5000);
    const targetsTimer = setInterval(fetchTargets, 10000);
    return () => {
      clearInterval(runsTimer);
      clearInterval(targetsTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRun = runs.find(r => r.run_id === selectedRunId) ?? null;

  return (
    <DashboardContext.Provider value={{
      runs,
      selectedRunId,
      setSelectedRunId,
      selectedRun,
      targets,
      selectedTarget,
      setSelectedTarget,
      refreshTargets: fetchTargets,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}

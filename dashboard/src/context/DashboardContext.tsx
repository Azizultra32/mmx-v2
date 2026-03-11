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

interface DashboardContextValue {
  runs: RunState[];
  selectedRunId: string | null;
  setSelectedRunId: (id: string | null) => void;
  selectedRun: RunState | null;
}

const DashboardContext = createContext<DashboardContextValue>({
  runs: [],
  selectedRunId: null,
  setSelectedRunId: () => {},
  selectedRun: null,
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [runs, setRuns] = useState<RunState[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

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
    const timer = setInterval(fetchRuns, 5000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRun = runs.find(r => r.run_id === selectedRunId) ?? null;

  return (
    <DashboardContext.Provider value={{ runs, selectedRunId, setSelectedRunId, selectedRun }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}

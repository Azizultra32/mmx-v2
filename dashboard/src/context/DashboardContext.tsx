import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface ComplianceData {
  targetName: string;
  targetPath: string;
  enginePath: string;
  ok: boolean;
  violations: string[];
  dirtyPaths: string[];
}

export interface RunData {
  runId: string;
  state: string;
  level: number;
  totalCostUsd: number;
  createdAt?: string;
  updatedAt?: string;
  error?: string;
}

export interface RunsData {
  runs: RunData[];
  targetName: string;
}

interface Ctx {
  compliance: ComplianceData | null;
  runs: RunData[];
  targetName: string;
  selectedRunId: string | null;
  setSelectedRunId: (id: string | null) => void;
  launching: boolean;
  lastLaunchError: string | null;
  launchRun: () => Promise<void>;
  refresh: () => void;
}

const DashboardCtx = createContext<Ctx>({
  compliance: null, runs: [], targetName: '', selectedRunId: null,
  setSelectedRunId: () => {}, launching: false, lastLaunchError: null,
  launchRun: async () => {}, refresh: () => {},
});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [runs, setRuns] = useState<RunData[]>([]);
  const [targetName, setTargetName] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [lastLaunchError, setLastLaunchError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([
        fetch('/api/compliance').then(x => x.json()),
        fetch('/api/runs').then(x => x.json()),
      ]);
      setCompliance(c as ComplianceData);
      setRuns((r as RunsData).runs ?? []);
      setTargetName((c as ComplianceData).targetName ?? (r as RunsData).targetName ?? '');
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const launchRun = useCallback(async () => {
    setLaunching(true);
    setLastLaunchError(null);
    try {
      const res = await fetch('/api/run', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) {
        setLastLaunchError(data.violations?.join(', ') ?? 'Launch blocked');
      } else {
        await refresh();
      }
    } catch (e) {
      setLastLaunchError(String(e));
    } finally {
      setLaunching(false);
    }
  }, [refresh]);

  return (
    <DashboardCtx.Provider value={{ compliance, runs, targetName, selectedRunId, setSelectedRunId, launching, lastLaunchError, launchRun, refresh }}>
      {children}
    </DashboardCtx.Provider>
  );
}

export const useDashboard = () => useContext(DashboardCtx);

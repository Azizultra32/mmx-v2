import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { NewTargetModal } from './NewTargetModal';

export function TargetBar() {
  const { targets, selectedTarget, setSelectedTarget, refreshTargets } = useDashboard();
  const [showModal, setShowModal] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchMsg, setLaunchMsg] = useState('');
  const [launchOk, setLaunchOk] = useState<boolean | null>(null);

  async function launchRun() {
    if (!selectedTarget) return;
    setLaunching(true);
    setLaunchMsg('');
    setLaunchOk(null);
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: selectedTarget.source_path, level: 1 }),
      });
      const data = await res.json() as { ok: boolean; runId?: string; error?: string; violations?: string[] };
      if (data.ok) {
        setLaunchOk(true);
        setLaunchMsg(`launched ${data.runId ?? ''}`);
        setTimeout(() => { setLaunchMsg(''); setLaunchOk(null); }, 4000);
      } else {
        setLaunchOk(false);
        setLaunchMsg(data.error ?? data.violations?.join(', ') ?? 'launch failed');
      }
    } catch (e) {
      setLaunchOk(false);
      setLaunchMsg(String(e));
    } finally {
      setLaunching(false);
    }
  }

  return (
    <>
      <div className="target-bar">
        <span className="target-bar-label">TARGET</span>

        {targets.length === 0 ? (
          <span className="target-bar-empty">No targets — create one</span>
        ) : (
          <select
            className="target-select"
            value={selectedTarget?.target_id ?? ''}
            onChange={e => {
              const t = targets.find(x => x.target_id === e.target.value) ?? null;
              setSelectedTarget(t);
            }}
          >
            {targets.map(t => (
              <option key={t.target_id} value={t.target_id}>
                {t.display_name} ({t.source_type}{t.run_count ? ` · ${t.run_count} runs` : ''})
              </option>
            ))}
          </select>
        )}

        <button className="target-btn-new" onClick={() => setShowModal(true)}>
          + NEW TARGET
        </button>

        <button
          className={`launch-btn ${launching ? 'running' : ''}`}
          onClick={launchRun}
          disabled={launching || !selectedTarget}
        >
          {launching ? 'LAUNCHING…' : 'NEW RUN'}
        </button>

        {launchMsg && (
          <span className={launchOk ? 'launch-ok' : 'launch-error'}>{launchMsg}</span>
        )}

        {selectedTarget && (
          <span className="target-bar-path">{selectedTarget.source_path}</span>
        )}
      </div>

      {showModal && (
        <NewTargetModal
          onClose={() => setShowModal(false)}
          onCreated={async (target) => {
            await refreshTargets();
            setSelectedTarget(target);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

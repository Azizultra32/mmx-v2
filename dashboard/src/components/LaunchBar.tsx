import { useState } from 'react';

export function LaunchBar() {
  const [repo, setRepo] = useState('');
  const [level, setLevel] = useState('1');
  const [status, setStatus] = useState<'idle' | 'launching' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function launch() {
    if (!repo.trim()) return;
    setStatus('launching');
    setMsg('');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: repo.trim(), level: parseInt(level, 10) }),
      });
      const data = await res.json() as { ok: boolean; runId?: string; error?: string; violations?: string[] };
      if (data.ok) {
        setStatus('ok');
        setMsg(`launched ${data.runId ?? ''}`);
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setMsg(data.error ?? data.violations?.join(', ') ?? 'launch failed');
      }
    } catch (e) {
      setStatus('error');
      setMsg(String(e));
    }
  }

  return (
    <div className="launch-bar">
      <span className="launch-label">Target</span>
      <input
        className="launch-input"
        value={repo}
        onChange={e => setRepo(e.target.value)}
        placeholder="/path/to/repo"
        onKeyDown={e => e.key === 'Enter' && launch()}
      />
      <span className="launch-label">Level</span>
      <input
        className="launch-level"
        type="number"
        min={1}
        max={3}
        value={level}
        onChange={e => setLevel(e.target.value)}
      />
      <button
        className={`launch-btn ${status === 'launching' ? 'running' : ''}`}
        onClick={launch}
        disabled={status === 'launching' || !repo.trim()}
      >
        {status === 'launching' ? 'LAUNCHING…' : 'RUN'}
      </button>
      {status === 'error' && <span className="launch-error">{msg}</span>}
      {status === 'ok' && <span className="launch-ok">{msg}</span>}
    </div>
  );
}

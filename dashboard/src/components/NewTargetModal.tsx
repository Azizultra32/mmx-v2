import { useState } from 'react';
import type { TargetInfo } from '../context/DashboardContext';

interface Props {
  onClose: () => void;
  onCreated: (target: TargetInfo) => void;
}

export function NewTargetModal({ onClose, onCreated }: Props) {
  const [mode, setMode] = useState<'demo' | 'github'>('demo');
  const [githubUrl, setGithubUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function createDemo() {
    setStatus('working');
    setErrorMsg('');
    try {
      const res = await fetch('/api/targets/scaffold', { method: 'POST' });
      const data = await res.json() as { ok: boolean; targetPath?: string; targetId?: string; displayName?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'scaffold failed');
      onCreated({
        target_id: data.targetId ?? 'demo',
        display_name: data.displayName ?? 'Demo Sandbox',
        source_type: 'demo',
        source_path: data.targetPath ?? '',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      setStatus('error');
      setErrorMsg(String(e));
    }
  }

  async function cloneGitHub() {
    if (!githubUrl.trim()) return;
    setStatus('working');
    setErrorMsg('');
    try {
      const res = await fetch('/api/targets/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: githubUrl.trim() }),
      });
      const data = await res.json() as { ok: boolean; targetPath?: string; targetId?: string; displayName?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'clone failed');
      onCreated({
        target_id: data.targetId ?? 'github',
        display_name: data.displayName ?? githubUrl.split('/').pop() ?? 'GitHub Repo',
        source_type: 'github',
        source_path: data.targetPath ?? '',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      setStatus('error');
      setErrorMsg(String(e));
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">NEW TARGET</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${mode === 'demo' ? 'active' : ''}`}
            onClick={() => setMode('demo')}
          >
            DEMO SANDBOX
          </button>
          <button
            className={`modal-tab ${mode === 'github' ? 'active' : ''}`}
            onClick={() => setMode('github')}
          >
            GITHUB CLONE
          </button>
        </div>

        <div className="modal-body">
          {mode === 'demo' && (
            <div>
              <p className="modal-desc">
                Creates <code>~/mmx-sandbox/</code> with 6 TypeScript files containing
                intentional bugs (SQL injection, null deref, race conditions, hardcoded creds).
                Deterministic proof path for MMX.
              </p>
              <button
                className="launch-btn"
                onClick={createDemo}
                disabled={status === 'working'}
              >
                {status === 'working' ? 'CREATING…' : 'CREATE DEMO SANDBOX'}
              </button>
            </div>
          )}

          {mode === 'github' && (
            <div>
              <p className="modal-desc">
                Clone a public GitHub repo into <code>~/.mmx-targets/</code>.
                MMX runs against the clone — the original is never touched.
              </p>
              <div className="modal-input-row">
                <input
                  className="launch-input"
                  placeholder="https://github.com/owner/repo"
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && cloneGitHub()}
                />
                <button
                  className="launch-btn"
                  onClick={cloneGitHub}
                  disabled={status === 'working' || !githubUrl.trim()}
                >
                  {status === 'working' ? 'CLONING…' : 'CLONE'}
                </button>
              </div>
            </div>
          )}

          {status === 'error' && <div className="launch-error" style={{marginTop: 8}}>{errorMsg}</div>}
        </div>
      </div>
    </div>
  );
}

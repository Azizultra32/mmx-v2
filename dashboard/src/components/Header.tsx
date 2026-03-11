import { useDashboard } from '../context/DashboardContext';

export function Header() {
  const { compliance, targetName, launching, lastLaunchError, launchRun } = useDashboard();

  const blocked = compliance && !compliance.ok;
  const ready = compliance && compliance.ok;

  const statusColor = !compliance ? '#555' : blocked ? 'var(--red)' : 'var(--green)';
  const statusLabel = !compliance ? 'CONNECTING...' : blocked ? 'BLOCKED' : 'READY';

  return (
    <header style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--dim)', marginBottom: 2 }}>
          MMX MISSION CONTROL
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
          {targetName || '...'}
        </div>
      </div>

      <div style={{
        padding: '6px 14px',
        border: `1px solid ${statusColor}`,
        borderRadius: 4,
        color: statusColor,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.1em',
      }}>
        {statusLabel}
      </div>

      {blocked && compliance?.violations && (
        <div style={{ fontSize: 12, color: 'var(--red)', flex: 1 }}>
          {compliance.violations.join(' · ')}
          {compliance.dirtyPaths?.length > 0 && (
            <span style={{ marginLeft: 8, color: 'var(--dim)' }}>
              ({compliance.dirtyPaths.slice(0, 3).join(', ')}{compliance.dirtyPaths.length > 3 ? '...' : ''})
            </span>
          )}
        </div>
      )}

      {lastLaunchError && (
        <div style={{ fontSize: 12, color: 'var(--red)' }}>{lastLaunchError}</div>
      )}

      <button
        onClick={launchRun}
        disabled={!ready || launching}
        style={{
          marginLeft: 'auto',
          padding: '10px 22px',
          background: ready && !launching ? 'var(--green)' : 'var(--bg3)',
          color: ready && !launching ? '#000' : 'var(--dim)',
          border: 'none',
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 700,
          cursor: ready && !launching ? 'pointer' : 'not-allowed',
          letterSpacing: '0.08em',
        }}
      >
        {launching ? 'LAUNCHING...' : 'LAUNCH MISSION'}
      </button>
    </header>
  );
}

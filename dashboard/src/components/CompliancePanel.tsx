import { useDashboard } from '../context/DashboardContext';

const CHECKS = [
  { key: 'ENGINE_EQUALS_TARGET', label: 'Engine ≠ Target' },
  { key: 'TARGET_DIRTY', label: 'Target repo clean' },
  { key: 'WORKSPACE_OUTSIDE_TARGET', label: 'Workspace inside target' },
];

export function CompliancePanel() {
  const { compliance } = useDashboard();

  return (
    <div className="panel">
      <div className="panel-title">Three Laws</div>
      {!compliance ? (
        <div style={{ color: 'var(--dim)', fontSize: 13 }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CHECKS.map(({ key, label }) => {
            const violated = compliance.violations.includes(key);
            const color = violated ? 'var(--red)' : 'var(--green)';
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color, fontSize: 16, width: 20 }}>{violated ? '✗' : '✓'}</span>
                <span style={{ fontSize: 13, color: violated ? 'var(--red)' : 'var(--text)' }}>{label}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--dim)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div>ENGINE</div>
            <div style={{ color: 'var(--text)', fontSize: 11, marginTop: 2, wordBreak: 'break-all' }}>{compliance.enginePath}</div>
            <div style={{ marginTop: 6 }}>TARGET</div>
            <div style={{ color: 'var(--blue)', fontSize: 11, marginTop: 2, wordBreak: 'break-all' }}>{compliance.targetPath}</div>
          </div>
        </div>
      )}
    </div>
  );
}

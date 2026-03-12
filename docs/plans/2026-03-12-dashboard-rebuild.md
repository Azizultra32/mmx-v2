# MMX v2 Dashboard Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken dashboard skeleton with a fully functional mission control UI — launch runs, watch stages execute live, triage failures, and approve/reject at HumanGate.

**Architecture:** Keep the existing data layer (DashboardContext, SSE EventFeed, /api/runs polling) intact. Replace all visual components. Add LaunchBar and HumanGate panel. Fix CSS so stage states render correctly. All components are functional React with Tailwind-style inline CSS variables — no new dependencies.

**Tech Stack:** React 18, TypeScript, Vite, existing Node HTTP server (`src/commands/dashboard.ts`), SSE via `/api/events`, REST via `/api/runs` + `POST /api/run`

**Spec source:** MMX_DASHBOARD_CANON from `/Users/ali/Downloads/MMX 2.txt`

**CRITICAL RULES:**
- No new npm dependencies
- Keep all existing API contracts (`/api/runs`, `/api/events`, `POST /api/run`, `GET /api/run/:runId`)
- All stage state logic stays in DashboardContext — components only read context
- HumanGate approval hits `POST /api/run/:runId/approve` (add to server if missing)

---

## Task 1: Audit existing components and fix CSS foundation

**Files:**
- Read: `dashboard/src/App.css`
- Modify: `dashboard/src/App.css`
- Read: `dashboard/src/components/StageSpine.tsx`

**Step 1: Read current CSS**

```bash
cat /Users/ali/mmx-v2/dashboard/src/App.css
```

**Step 2: Replace App.css with working foundation**

The current CSS has `.stage-item.running` etc. but the stage dots use emoji characters as content, not CSS. Replace with a proper dark terminal theme:

```css
/* dashboard/src/App.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0d0d0d;
  --bg2: #141414;
  --bg3: #1a1a1a;
  --border: #2a2a2a;
  --text: #e0e0e0;
  --muted: #666;
  --accent: #3b82f6;
  --green: #22c55e;
  --red: #ef4444;
  --yellow: #eab308;
  --pulse: #3b82f6;
}

body { background: var(--bg); color: var(--text); font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 13px; }

.app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

/* ── Header ── */
.header { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: var(--bg2); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.header-title { color: var(--accent); font-weight: 700; font-size: 14px; letter-spacing: 0.05em; }
.header-target { color: var(--muted); font-size: 11px; }

/* ── Launch Bar ── */
.launch-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--bg2); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.launch-label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
.launch-input { flex: 1; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 6px 10px; font-family: inherit; font-size: 12px; border-radius: 3px; outline: none; }
.launch-input:focus { border-color: var(--accent); }
.launch-level { width: 60px; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 6px 8px; font-family: inherit; font-size: 12px; border-radius: 3px; outline: none; }
.launch-btn { background: var(--accent); color: #fff; border: none; padding: 7px 20px; font-family: inherit; font-size: 12px; font-weight: 700; border-radius: 3px; cursor: pointer; letter-spacing: 0.05em; transition: opacity 0.15s; }
.launch-btn:hover { opacity: 0.85; }
.launch-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.launch-btn.running { background: var(--yellow); }
.launch-error { color: var(--red); font-size: 11px; }
.launch-ok { color: var(--green); font-size: 11px; }

/* ── Main layout ── */
.main { display: flex; flex: 1; overflow: hidden; }
.sidebar { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; border-right: 1px solid var(--border); overflow: hidden; }
.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* ── Stage Spine ── */
.stage-spine { display: flex; align-items: center; gap: 0; padding: 0 12px; background: var(--bg2); border-bottom: 1px solid var(--border); flex-shrink: 0; overflow-x: auto; }
.stage-item { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-right: 1px solid var(--border); cursor: default; min-width: 0; flex-shrink: 0; }
.stage-item:last-child { border-right: none; }
.stage-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stage-dot.pending { background: var(--border); }
.stage-dot.running { background: var(--pulse); box-shadow: 0 0 0 0 var(--pulse); animation: pulse 1.2s infinite; }
.stage-dot.complete { background: var(--green); }
.stage-dot.failed { background: var(--red); }
.stage-name { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.stage-item.running .stage-name { color: var(--text); }
.stage-item.complete .stage-name { color: var(--green); }
.stage-item.failed .stage-name { color: var(--red); }

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); }
  70% { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
  100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
}

/* ── Event Feed ── */
.event-feed { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 2px; }
.event-feed h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 8px; flex-shrink: 0; }
.no-run { color: var(--muted); font-size: 12px; }
.event-feed-empty { color: var(--muted); font-size: 12px; }
.event-row { display: flex; gap: 10px; font-size: 11px; line-height: 1.5; font-family: inherit; border-bottom: 1px solid rgba(42,42,42,0.5); padding: 3px 0; }
.event-ts { color: var(--muted); flex-shrink: 0; width: 80px; }
.event-type { flex-shrink: 0; width: 140px; font-weight: 600; }
.event-type.event-type-UNIT_COMPLETE { color: var(--green); }
.event-type.event-type-UNIT_FAILED { color: var(--red); }
.event-type.event-type-DISPATCH_STARTED { color: var(--accent); }
.event-type.event-type-default { color: var(--muted); }
.event-stage { color: var(--yellow); flex-shrink: 0; width: 90px; }
.event-details { color: var(--text); opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

/* ── Run History ── */
.run-history { flex: 1; overflow-y: auto; padding: 12px; }
.run-history h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 8px; }
.run-item { padding: 8px 10px; margin-bottom: 4px; border-radius: 3px; cursor: pointer; border: 1px solid transparent; transition: border-color 0.1s; }
.run-item:hover { border-color: var(--border); }
.run-item.selected { border-color: var(--accent); background: rgba(59,130,246,0.08); }
.run-id { font-size: 11px; color: var(--text); font-weight: 600; margin-bottom: 3px; }
.run-meta { font-size: 10px; color: var(--muted); display: flex; justify-content: space-between; }
.run-state { font-size: 10px; font-weight: 700; }
.run-state.COMPLETE { color: var(--green); }
.run-state.FAILED { color: var(--red); }
.run-state.INITIALIZED, .run-state.RUNNING { color: var(--accent); }

/* ── Cost Breakdown ── */
.cost-breakdown { padding: 12px; border-top: 1px solid var(--border); flex-shrink: 0; }
.cost-breakdown h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px; }
.cost-total { font-size: 16px; font-weight: 700; color: var(--text); }
.cost-usd { font-size: 10px; color: var(--muted); }

/* ── HumanGate Panel ── */
.humangate-panel { background: rgba(234,179,8,0.08); border: 1px solid var(--yellow); border-radius: 4px; margin: 16px; padding: 16px; }
.humangate-title { font-size: 12px; font-weight: 700; color: var(--yellow); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.humangate-desc { font-size: 11px; color: var(--muted); margin-bottom: 12px; line-height: 1.6; }
.humangate-actions { display: flex; gap: 8px; }
.humangate-approve { background: var(--green); color: #000; border: none; padding: 7px 20px; font-family: inherit; font-size: 12px; font-weight: 700; border-radius: 3px; cursor: pointer; }
.humangate-reject { background: transparent; color: var(--red); border: 1px solid var(--red); padding: 7px 20px; font-family: inherit; font-size: 12px; font-weight: 700; border-radius: 3px; cursor: pointer; }

/* ── Failure Triage ── */
.failure-panel { background: rgba(239,68,68,0.08); border: 1px solid var(--red); border-radius: 4px; margin: 16px; padding: 16px; }
.failure-title { font-size: 12px; font-weight: 700; color: var(--red); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.failure-msg { font-size: 11px; color: var(--text); font-family: inherit; white-space: pre-wrap; word-break: break-word; }

/* ── Empty states ── */
.empty-state { color: var(--muted); font-size: 12px; padding: 24px 16px; text-align: center; }
```

**Step 3: Verify it compiles**

```bash
cd /Users/ali/mmx-v2/dashboard && npm run build 2>&1 | tail -10
```

Expected: zero errors.

**Step 4: Commit**

```bash
git -C /Users/ali/mmx-v2 add dashboard/src/App.css
git -C /Users/ali/mmx-v2 commit -m "style: complete CSS foundation — terminal dark theme, all component states"
```

---

## Task 2: Fix StageSpine — CSS classes not emojis

**Files:**
- Modify: `dashboard/src/components/StageSpine.tsx`

The current `stageDot()` function returns emoji strings (`🔵`, `✅`, `❌`, `⬜`) as content. These don't work as CSS class drivers. Replace with a `<span className="stage-dot {status}">` approach.

**Step 1: Read current StageSpine.tsx**

```bash
cat /Users/ali/mmx-v2/dashboard/src/components/StageSpine.tsx
```

**Step 2: Rewrite StageSpine.tsx**

```tsx
// dashboard/src/components/StageSpine.tsx
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
```

**Step 3: Build**

```bash
cd /Users/ali/mmx-v2/dashboard && npm run build 2>&1 | tail -5
```

Expected: zero errors.

**Step 4: Commit**

```bash
git -C /Users/ali/mmx-v2 add dashboard/src/components/StageSpine.tsx
git -C /Users/ali/mmx-v2 commit -m "fix: StageSpine — CSS class dots replace emoji, lowercase stage matching"
```

---

## Task 3: Add LaunchBar component

**Files:**
- Create: `dashboard/src/components/LaunchBar.tsx`
- Modify: `dashboard/src/App.tsx`

The dashboard has no way to start a run. LaunchBar adds a target path input, level selector, and RUN button that hits `POST /api/run`.

**Step 1: Create LaunchBar.tsx**

```tsx
// dashboard/src/components/LaunchBar.tsx
import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export function LaunchBar() {
  const { targetPath: contextTarget } = useDashboard();
  const [repo, setRepo] = useState(contextTarget ?? '');
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
```

**Step 2: Update DashboardContext to expose targetPath**

Open `dashboard/src/context/DashboardContext.tsx`. Add `targetPath` to the context value so LaunchBar can pre-fill it:

```tsx
// In DashboardContextValue interface, add:
targetPath: string | null;

// In fetchRuns response, parse targetPath:
const data = await res.json() as { runs: RunState[]; targetName?: string };
// Add state: const [targetPath, setTargetPath] = useState<string | null>(null);
// Set it from first run if available, or from /api/runs response
```

Actually, simpler: just let LaunchBar start empty and the user fills in the path. Skip DashboardContext change. LaunchBar works standalone.

**Step 3: Wire LaunchBar into App.tsx**

```tsx
// dashboard/src/App.tsx
import './App.css';
import { DashboardProvider } from './context/DashboardContext';
import { Header } from './components/Header';
import { LaunchBar } from './components/LaunchBar';
import { StageSpine } from './components/StageSpine';
import { EventFeed } from './components/EventFeed';
import { RunHistory } from './components/RunHistory';
import { CostBreakdown } from './components/CostBreakdown';

function App() {
  return (
    <DashboardProvider>
      <div className="app">
        <Header />
        <LaunchBar />
        <div className="main">
          <div className="sidebar">
            <RunHistory />
            <CostBreakdown />
          </div>
          <div className="content">
            <StageSpine />
            <EventFeed />
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
}

export default App;
```

**Step 4: Remove `targetPath` from LaunchBar if DashboardContext doesn't expose it**

Just delete the `useDashboard()` call and `contextTarget` line in LaunchBar — start with empty string.

**Step 5: Build**

```bash
cd /Users/ali/mmx-v2/dashboard && npm run build 2>&1 | tail -5
```

Expected: zero errors.

**Step 6: Commit**

```bash
git -C /Users/ali/mmx-v2 add dashboard/src/components/LaunchBar.tsx dashboard/src/App.tsx
git -C /Users/ali/mmx-v2 commit -m "feat: LaunchBar — target input, level, RUN button, POST /api/run"
```

---

## Task 4: Fix server — POST /api/run body parsing + HumanGate endpoint

**Files:**
- Modify: `src/commands/dashboard.ts`

The current `POST /api/run` handler uses hardcoded `opts.targetPath` from CLI args, not the request body. It also has no `/api/run/:runId/approve` endpoint for HumanGate.

**Step 1: Read current dashboard.ts POST handler**

```bash
grep -n "POST\|api/run\|body\|json\|approve" /Users/ali/mmx-v2/src/commands/dashboard.ts
```

**Step 2: Fix POST /api/run to read request body**

In `src/commands/dashboard.ts`, find the `POST /api/run` block and update it to parse the JSON body:

```typescript
// ── POST /api/run ───────────────────────────────────────────────────────
if (method === 'POST' && pathname === '/api/run') {
  // Parse JSON body
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  let body: { targetPath?: string; level?: number } = {};
  try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* empty body ok */ }

  const targetPath = body.targetPath ?? opts.targetPath;
  const level = body.level ?? 1;

  const check = await checkThreeLaws({ enginePath, targetPath });
  if (!check.ok) {
    json(res, 400, { ok: false, violations: check.violations, dirtyPaths: check.dirtyPaths });
    return;
  }

  const runId = `mmx-${randomBytes(4).toString('hex')}`;
  const { spawn } = await import('child_process');
  const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/cli.js');
  const child = spawn(process.execPath, [cli, 'run', targetPath, '--level', String(level)], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  json(res, 200, { ok: true, runId });
  return;
}
```

**Step 3: Add POST /api/run/:runId/approve endpoint**

After the existing run route, add:

```typescript
// ── POST /api/run/:runId/approve ────────────────────────────────────────
const approveMatch = pathname.match(/^\/api\/run\/([^/]+)\/approve$/);
if (method === 'POST' && approveMatch) {
  const runId = approveMatch[1];
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  let body: { approved?: boolean } = {};
  try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* ok */ }

  // Write human approval artifact
  const approvalPath = path.join(
    opts.targetPath, '.metamatrix', 'runs', runId, 'humangate', 'human-approval.json'
  );
  await fs.mkdir(path.dirname(approvalPath), { recursive: true });
  await fs.writeFile(approvalPath, JSON.stringify({
    approved: body.approved ?? true,
    decided_at: new Date().toISOString(),
    decided_by: 'dashboard',
  }, null, 2));

  json(res, 200, { ok: true, runId, approved: body.approved ?? true });
  return;
}
```

**Step 4: Check TypeScript**

```bash
npx --prefix /Users/ali/mmx-v2 tsc --noEmit --project /Users/ali/mmx-v2/tsconfig.json 2>&1
```

Expected: 0 errors.

**Step 5: Rebuild dist**

```bash
npm run --prefix /Users/ali/mmx-v2 build 2>&1 | tail -5
```

**Step 6: Commit**

```bash
git -C /Users/ali/mmx-v2 add src/commands/dashboard.ts
git -C /Users/ali/mmx-v2 commit -m "fix: dashboard server — parse POST /api/run body, add /approve endpoint"
```

---

## Task 5: HumanGate panel + Failure triage in EventFeed

**Files:**
- Modify: `dashboard/src/components/EventFeed.tsx`

When a run is at `HUMANGATE` state, replace the raw event feed with an approve/reject panel. When state is `FAILED`, show failure triage.

**Step 1: Update EventFeed.tsx**

```tsx
// dashboard/src/components/EventFeed.tsx
import { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

interface ActivityEvent {
  ts: string;
  event_type: string;
  stage?: string;
  message?: string;
  [key: string]: unknown;
}

function formatTime(ts: string): string {
  try { return new Date(ts).toLocaleTimeString('en-US', { hour12: false }); }
  catch { return ts; }
}

function formatDetails(event: ActivityEvent): string {
  const { ts: _ts, event_type: _et, stage: _st, message: _msg, ...rest } = event;
  if (_msg) return _msg;
  const parts = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  return parts.join(' ') || '—';
}

function eventTypeClass(et: string): string {
  if (et === 'UNIT_COMPLETE') return 'event-type-UNIT_COMPLETE';
  if (et === 'UNIT_FAILED') return 'event-type-UNIT_FAILED';
  if (et === 'DISPATCH_STARTED') return 'event-type-DISPATCH_STARTED';
  return 'event-type-default';
}

function HumanGatePanel({ runId }: { runId: string }) {
  const [status, setStatus] = useState<'idle' | 'deciding'>('idle');

  async function decide(approved: boolean) {
    setStatus('deciding');
    await fetch(`/api/run/${runId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    setStatus('idle');
  }

  return (
    <div className="humangate-panel">
      <div className="humangate-title">⏸ Human Gate — Waiting for Approval</div>
      <div className="humangate-desc">
        The pipeline has paused at HumanGate. Review the implementation report and approve or reject to continue.
      </div>
      <div className="humangate-actions">
        <button className="humangate-approve" onClick={() => decide(true)} disabled={status === 'deciding'}>
          APPROVE
        </button>
        <button className="humangate-reject" onClick={() => decide(false)} disabled={status === 'deciding'}>
          REJECT
        </button>
      </div>
    </div>
  );
}

function FailurePanel({ error }: { error: string }) {
  return (
    <div className="failure-panel">
      <div className="failure-title">✗ Run Failed</div>
      <pre className="failure-msg">{error}</pre>
    </div>
  );
}

export function EventFeed() {
  const { selectedRunId, selectedRun } = useDashboard();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const prevRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedRunId === prevRunIdRef.current) return;
    prevRunIdRef.current = selectedRunId;
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    if (!selectedRunId) { setEvents([]); return; }

    setEvents([]);
    const es = new EventSource(`/api/events?runId=${encodeURIComponent(selectedRunId)}`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ActivityEvent;
        setEvents(prev => [event, ...prev].slice(0, 200));
      } catch { /* ignore */ }
    };
    return () => { es.close(); };
  }, [selectedRunId]);

  const isHumanGate = selectedRun?.state === 'AWAITING_HUMAN' ||
    selectedRun?.active_stage?.toLowerCase() === 'humangate';
  const isFailed = selectedRun?.state === 'FAILED';

  return (
    <div className="event-feed">
      <h3>Live Event Feed {selectedRun ? `— ${selectedRun.run_id}` : ''}</h3>

      {!selectedRunId && <div className="no-run">No run selected — launch one above or pick from history</div>}

      {isHumanGate && selectedRunId && <HumanGatePanel runId={selectedRunId} />}
      {isFailed && selectedRun?.error && <FailurePanel error={selectedRun.error} />}

      {selectedRunId && events.length === 0 && !isHumanGate && (
        <div className="event-feed-empty">Waiting for events…</div>
      )}

      {events.map((event, i) => (
        <div key={i} className="event-row">
          <span className="event-ts">{formatTime(event.ts)}</span>
          <span className={`event-type ${eventTypeClass(event.event_type)}`}>{event.event_type}</span>
          <span className="event-stage">{event.stage ?? '—'}</span>
          <span className="event-details">{formatDetails(event)}</span>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Build**

```bash
cd /Users/ali/mmx-v2/dashboard && npm run build 2>&1 | tail -5
```

Expected: zero errors.

**Step 3: Commit**

```bash
git -C /Users/ali/mmx-v2 add dashboard/src/components/EventFeed.tsx
git -C /Users/ali/mmx-v2 commit -m "feat: EventFeed — HumanGate approve/reject panel, failure triage, message field"
```

---

## Task 6: Fix RunHistory and CostBreakdown

**Files:**
- Modify: `dashboard/src/components/RunHistory.tsx`
- Modify: `dashboard/src/components/CostBreakdown.tsx`

**Step 1: Read both files**

```bash
cat /Users/ali/mmx-v2/dashboard/src/components/RunHistory.tsx
cat /Users/ali/mmx-v2/dashboard/src/components/CostBreakdown.tsx
```

**Step 2: Rewrite RunHistory.tsx**

Show run ID (truncated), state badge, cost, time since created. Selected run highlighted.

```tsx
// dashboard/src/components/RunHistory.tsx
import { useDashboard } from '../context/DashboardContext';
import type { RunState } from '../context/DashboardContext';

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function StateChip({ state }: { state: string }) {
  return <span className={`run-state ${state}`}>{state}</span>;
}

function RunItem({ run, selected, onClick }: { run: RunState; selected: boolean; onClick: () => void }) {
  return (
    <div className={`run-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="run-id">{run.run_id}</div>
      <div className="run-meta">
        <StateChip state={run.state} />
        <span>${run.total_cost_usd.toFixed(4)}</span>
        <span>{timeSince(run.created_at)}</span>
      </div>
    </div>
  );
}

export function RunHistory() {
  const { runs, selectedRunId, setSelectedRunId } = useDashboard();

  return (
    <div className="run-history">
      <h3>Run History</h3>
      {runs.length === 0 && <div className="empty-state">No runs yet</div>}
      {runs.map(run => (
        <RunItem
          key={run.run_id}
          run={run}
          selected={run.run_id === selectedRunId}
          onClick={() => setSelectedRunId(run.run_id)}
        />
      ))}
    </div>
  );
}
```

**Step 3: Rewrite CostBreakdown.tsx**

Show total cost of selected run, and cumulative all-time cost.

```tsx
// dashboard/src/components/CostBreakdown.tsx
import { useDashboard } from '../context/DashboardContext';

export function CostBreakdown() {
  const { runs, selectedRun } = useDashboard();
  const total = runs.reduce((sum, r) => sum + r.total_cost_usd, 0);

  return (
    <div className="cost-breakdown">
      <h3>Cost</h3>
      {selectedRun && (
        <div style={{ marginBottom: 6 }}>
          <div className="cost-total">${selectedRun.total_cost_usd.toFixed(4)}</div>
          <div className="cost-usd">this run</div>
        </div>
      )}
      <div className="cost-total" style={{ fontSize: 13 }}>${total.toFixed(4)}</div>
      <div className="cost-usd">all time ({runs.length} runs)</div>
    </div>
  );
}
```

**Step 4: Build**

```bash
cd /Users/ali/mmx-v2/dashboard && npm run build 2>&1 | tail -5
```

Expected: zero errors.

**Step 5: Commit**

```bash
git -C /Users/ali/mmx-v2 add dashboard/src/components/RunHistory.tsx dashboard/src/components/CostBreakdown.tsx
git -C /Users/ali/mmx-v2 commit -m "feat: RunHistory — state badges, cost, time; CostBreakdown — run + all-time"
```

---

## Task 7: Rebuild dashboard dist, restart server, verify visually

**Step 1: Full rebuild**

```bash
cd /Users/ali/mmx-v2/dashboard && npm run build 2>&1
```

Expected: zero errors, dist/ updated.

**Step 2: Kill existing server and restart**

```bash
pkill -f "node.*cli.js dashboard" 2>/dev/null || true
sleep 1
node /Users/ali/mmx-v2/dist/cli.js dashboard --repo /Users/ali/aims --port 4242 &
sleep 2
curl -s http://localhost:4242/api/runs | python3 -m json.tool
```

Expected: server responds with JSON.

**Step 3: Take screenshot and verify**

Navigate to http://localhost:4242 and confirm:
- ✅ Header shows "MMX v2"
- ✅ LaunchBar with input, level, RUN button visible
- ✅ Stage spine shows 8 stages with grey dots (no emojis)
- ✅ Sidebar shows "No runs yet" in RunHistory
- ✅ Main area shows "No run selected — launch one above..."
- ✅ No white/broken layout

**Step 4: Final commit**

```bash
git -C /Users/ali/mmx-v2 add .
git -C /Users/ali/mmx-v2 commit -m "chore: rebuild dashboard dist after full UI overhaul"
git -C /Users/ali/mmx-v2 push origin main
```

---

## Success Criteria

| Feature | Verifiable |
|---------|-----------|
| Launch bar visible | Screenshot shows input + RUN button |
| Stage dots use CSS (not emoji) | DevTools shows `.stage-dot.pending` etc |
| Stage pulse animation when running | Visible when a run is active |
| HumanGate panel appears at HUMANGATE | Panel replaces feed with APPROVE/REJECT |
| Failure panel on FAILED runs | Red panel shows error message |
| Run history shows state + cost | Each run item has badge + $ amount |
| POST /api/run reads request body | `curl -X POST -d '{"targetPath":"..."}' /api/run` works |

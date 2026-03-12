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

import { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

interface ActivityEvent {
  ts: string;
  event_type: string;
  stage?: string;
  [key: string]: unknown;
}

function eventTypeClass(eventType: string): string {
  if (eventType === 'UNIT_COMPLETE') return 'event-type-UNIT_COMPLETE';
  if (eventType === 'UNIT_FAILED') return 'event-type-UNIT_FAILED';
  if (eventType === 'DISPATCH_STARTED') return 'event-type-DISPATCH_STARTED';
  return 'event-type-default';
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  } catch {
    return ts;
  }
}

function formatDetails(event: ActivityEvent): string {
  const { ts: _ts, event_type: _et, stage: _st, ...rest } = event;
  const parts = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  return parts.join(' ') || '—';
}

export function EventFeed() {
  const { selectedRunId } = useDashboard();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const prevRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedRunId === prevRunIdRef.current) return;
    prevRunIdRef.current = selectedRunId;

    // Close previous connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    if (!selectedRunId) {
      setEvents([]);
      return;
    }

    setEvents([]);

    const es = new EventSource(`/api/events?runId=${encodeURIComponent(selectedRunId)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ActivityEvent;
        setEvents(prev => [event, ...prev].slice(0, 100));
      } catch {
        // ignore malformed
      }
    };

    es.onerror = () => {
      // reconnect handled by browser automatically
    };

    return () => {
      es.close();
    };
  }, [selectedRunId]);

  return (
    <div className="event-feed">
      <h3>Live Event Feed</h3>
      {!selectedRunId && <div className="no-run">No run selected</div>}
      {selectedRunId && events.length === 0 && (
        <div className="event-feed-empty">Waiting for events…</div>
      )}
      {events.map((event, i) => (
        <div key={i} className="event-row">
          <span className="event-ts">{formatTime(event.ts)}</span>
          <span className={`event-type ${eventTypeClass(event.event_type)}`}>
            {event.event_type}
          </span>
          <span className="event-stage">{event.stage ?? '—'}</span>
          <span className="event-details">{formatDetails(event)}</span>
        </div>
      ))}
    </div>
  );
}

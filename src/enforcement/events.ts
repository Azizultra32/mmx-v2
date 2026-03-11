import fs from 'fs/promises';
import path from 'path';

export type EventType =
  | 'RUN_CREATED'
  | 'UNIT_CREATED'
  | 'INPUT_VALIDATION_STARTED'
  | 'INPUT_VALIDATION_PASSED'
  | 'INPUT_VALIDATION_FAILED'
  | 'PROMPT_ASSEMBLED'
  | 'PROMPT_BUDGET_REJECTED'
  | 'DISPATCH_STARTED'
  | 'FORK_CREATED'
  | 'OUTPUT_WRITTEN'
  | 'OUTPUT_VALIDATION_STARTED'
  | 'OUTPUT_VALIDATION_PASSED'
  | 'OUTPUT_VALIDATION_FAILED'
  | 'DOWNSTREAM_UNBLOCKED'
  | 'UNIT_COMPLETE'
  | 'UNIT_BLOCKED'
  | 'UNIT_FAILED'
  | 'HUMAN_PACKET_CREATED'
  | 'HUMAN_DECISION_RECORDED'
  | 'BRANCH_ABANDONED'
  | 'BRANCH_APPROVED';

export interface ActivityEvent {
  event_type: EventType;
  run_id: string;
  agent_id: string | null;
  stage: string | null;
  role?: string | null;
  thread_mode?: 'fresh' | 'forked' | null;
  thread_id?: string | null;
  parent_thread_id?: string | null;
  fork_path?: string | null;
  artifact_path?: string | null;
  status?: string | null;
  details?: Record<string, unknown>;
}

export class EventSpine {
  constructor(public readonly filePath: string) {}

  async emit(event: ActivityEvent): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
    await fs.appendFile(this.filePath, line, 'utf-8');
  }

  async readAll(): Promise<ActivityEvent[]> {
    let content: string;
    try {
      content = await fs.readFile(this.filePath, 'utf-8');
    } catch {
      return [];
    }
    return content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line) as ActivityEvent);
  }
}

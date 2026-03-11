import path from 'path';

export const metamatrixDir = (t: string) => path.join(t, '.metamatrix');
export const runsDir = (t: string) => path.join(metamatrixDir(t), 'runs');
export const runDir = (t: string, runId: string) => path.join(runsDir(t), runId);
export const runStatePath = (t: string, runId: string) => path.join(runDir(t, runId), 'state.json');
export const stageDir = (t: string, runId: string, stage: string) => path.join(runDir(t, runId), stage);

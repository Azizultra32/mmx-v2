import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const PROMPTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prompts/roles');

export async function loadRoleSkill(role: string): Promise<string> {
  return fs.readFile(path.join(PROMPTS_DIR, `${role}.md`), 'utf-8');
}

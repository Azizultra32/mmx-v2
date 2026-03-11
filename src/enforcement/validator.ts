import { promises as fs } from 'fs';
import type { ArtifactIOItem } from '../core/types.js';

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

async function validateItems(items: ArtifactIOItem[]): Promise<ValidationResult> {
  const violations: string[] = [];

  for (const item of items) {
    if (!item.required) {
      continue;
    }

    // Check file exists
    let fileExists = true;
    try {
      await fs.access(item.path);
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      violations.push(
        `CONTRACT_BREACH: required input missing or invalid — handle="${item.handle}" path="${item.path}"`
      );
      continue;
    }

    // If format is JSON, also verify the content parses
    if (item.format === 'json') {
      try {
        const content = await fs.readFile(item.path, 'utf-8');
        JSON.parse(content);
      } catch {
        violations.push(
          `CONTRACT_BREACH: required input missing or invalid — handle="${item.handle}" path="${item.path}"`
        );
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

// Check all required inputs exist (and parse as JSON if format='json')
export async function validateInputs(inputs: ArtifactIOItem[]): Promise<ValidationResult> {
  return validateItems(inputs);
}

// Check all required outputs were written (and parse as JSON if format='json')
export async function validateOutputs(outputs: ArtifactIOItem[]): Promise<ValidationResult> {
  return validateItems(outputs);
}

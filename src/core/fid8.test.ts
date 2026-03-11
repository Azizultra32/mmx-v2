import { describe, it, expect } from 'vitest';
import { generateFid8, fid8FromFile, isValidFid8 } from './fid8.js';

describe('fid8', () => {
  it('generates 8-char lowercase hex id', () => {
    const id = generateFid8();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[a-f0-9]{8}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, generateFid8));
    expect(ids.size).toBe(100);
  });

  it('extracts fid8 from simple filename', () => {
    expect(fid8FromFile('ab12cd34.json')).toBe('ab12cd34');
  });

  it('extracts fid8 from compound filename', () => {
    expect(fid8FromFile('ab12cd34.packet.json')).toBe('ab12cd34');
  });

  it('validates correct fid8', () => {
    expect(isValidFid8('ab12cd34')).toBe(true);
    expect(isValidFid8('ffffffff')).toBe(true);
  });

  it('rejects invalid fid8', () => {
    expect(isValidFid8('UPPERCASE')).toBe(false);
    expect(isValidFid8('short')).toBe(false);
    expect(isValidFid8('toolonggg')).toBe(false);
    expect(isValidFid8('zzzzzzzz')).toBe(false); // not hex
  });
});

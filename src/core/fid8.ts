import { randomBytes } from 'crypto';

/**
 * Generates an 8-character lowercase hex finding identity (fid8).
 * Uses crypto.randomBytes(4) for cryptographic randomness.
 */
export function generateFid8(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Extracts the fid8 from a filename by taking everything before the first dot.
 * e.g., 'ab12cd34.json' → 'ab12cd34'
 * e.g., 'ab12cd34.packet.json' → 'ab12cd34'
 */
export function fid8FromFile(filename: string): string {
  const dotIndex = filename.indexOf('.');
  return dotIndex === -1 ? filename : filename.slice(0, dotIndex);
}

/**
 * Returns true if id is a valid fid8: exactly 8 lowercase hex characters.
 */
export function isValidFid8(id: string): boolean {
  return /^[a-f0-9]{8}$/.test(id);
}

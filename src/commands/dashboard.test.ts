import { describe, it, expect } from 'vitest';
import http from 'node:http';
import { buildDashboardServer } from './dashboard.js';

describe('buildDashboardServer', () => {
  it('returns an http.Server instance', () => {
    const server = buildDashboardServer({ targetPath: '/tmp/test-target' });
    expect(server).toBeInstanceOf(http.Server);
    server.close();
  });

  it('server has a listen method', () => {
    const server = buildDashboardServer({ targetPath: '/tmp/test-target' });
    expect(typeof server.listen).toBe('function');
    server.close();
  });
});

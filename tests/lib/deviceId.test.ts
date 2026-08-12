import { describe, it, expect, beforeEach } from 'vitest';
import { getDeviceId } from '../../src/lib/deviceId';

describe('getDeviceId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a UUID-shaped id when none exists', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns the same id on repeated calls', () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(second).toBe(first);
  });

  it('persists the id to localStorage under a stable key', () => {
    const id = getDeviceId();
    expect(localStorage.getItem('wedding-cam-device-id')).toBe(id);
  });
});

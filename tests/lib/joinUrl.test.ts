import { describe, it, expect } from 'vitest';
import { buildJoinUrl } from '../../src/lib/joinUrl';

describe('buildJoinUrl', () => {
  it('builds a join URL from the current origin and folder id', () => {
    expect(buildJoinUrl('abc-123')).toBe(`${window.location.origin}/join/abc-123`);
  });
});

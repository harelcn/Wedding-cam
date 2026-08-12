import { describe, it, expect, beforeEach } from 'vitest';
import { getMyFolders, addMyFolder } from '../../src/lib/myFolders';

describe('myFolders', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getMyFolders()).toEqual([]);
  });

  it('adds a folder entry and persists it', () => {
    addMyFolder({ folderId: 'f1', name: 'Test', role: 'creator', savedAt: '2026-01-01T00:00:00.000Z' });
    expect(getMyFolders()).toEqual([
      { folderId: 'f1', name: 'Test', role: 'creator', savedAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('does not add a duplicate folderId', () => {
    addMyFolder({ folderId: 'f1', name: 'Test', role: 'creator', savedAt: '2026-01-01T00:00:00.000Z' });
    addMyFolder({ folderId: 'f1', name: 'Test again', role: 'joined', savedAt: '2026-01-02T00:00:00.000Z' });
    expect(getMyFolders()).toHaveLength(1);
  });

  it('returns an empty array when stored JSON is corrupted', () => {
    localStorage.setItem('wedding-cam-my-folders', '{not valid json');
    expect(getMyFolders()).toEqual([]);
  });

  it('returns an empty array when stored JSON is valid but not an array', () => {
    localStorage.setItem('wedding-cam-my-folders', '{}');
    expect(getMyFolders()).toEqual([]);
  });
});

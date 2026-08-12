import { describe, it, expect } from 'vitest';
import { publicMediaUrl } from '../../src/lib/publicMediaUrl';

describe('publicMediaUrl', () => {
  it('joins the base url and storage key', () => {
    expect(publicMediaUrl('folder-1/media-1.jpg', 'https://cdn.example.com')).toBe(
      'https://cdn.example.com/folder-1/media-1.jpg'
    );
  });

  it('strips a trailing slash from the base url', () => {
    expect(publicMediaUrl('folder-1/media-1.jpg', 'https://cdn.example.com/')).toBe(
      'https://cdn.example.com/folder-1/media-1.jpg'
    );
  });
});

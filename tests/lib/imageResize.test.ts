import { describe, it, expect } from 'vitest';
import { computeResizedDimensions } from '../../src/lib/imageResize';

describe('computeResizedDimensions', () => {
  it('leaves small images unchanged', () => {
    expect(computeResizedDimensions(800, 600, 1920)).toEqual({ width: 800, height: 600 });
  });

  it('downscales a wide image to fit the max dimension', () => {
    expect(computeResizedDimensions(4000, 2000, 1920)).toEqual({ width: 1920, height: 960 });
  });

  it('downscales a tall image to fit the max dimension', () => {
    expect(computeResizedDimensions(2000, 4000, 1920)).toEqual({ width: 960, height: 1920 });
  });

  it('leaves an image exactly at the max dimension unchanged', () => {
    expect(computeResizedDimensions(1920, 1080, 1920)).toEqual({ width: 1920, height: 1080 });
  });
});

// @vitest-environment node
// Tests for the newly-added pixel sprite generator functions.
// Canvas APIs are not natively available in Node.js, so we mock
// document.createElement('canvas') and the 2D context before importing.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock DOM canvas primitives
// ---------------------------------------------------------------------------

function makeMockCanvas(
  toDataURLImpl?: () => string,
): { width: number; height: number; getContext: (t: string) => object; toDataURL: () => string } {
  const ctx = {
    fillStyle: '',
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    font: '',
    globalAlpha: 1,
    clearRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    globalCompositeOperation: '',
  };
  const toDataURL = toDataURLImpl ?? (() => `data:image/png;base64,mock-${Date.now()}-${Math.random()}`);
  return {
    width: 0,
    height: 0,
    getContext: (_t: string) => ctx,
    toDataURL,
  };
}

// Fresh spy that generates unique output per call
function uniqueDataURLSpy() {
  let counter = 0;
  const fn = vi.fn(() => `data:image/png;base64,mock-${++counter}`);
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-register a fresh `document.createElement` that returns a mock canvas
  (globalThis as any).document = {
    createElement: () => makeMockCanvas(),
  };
});

// ---------------------------------------------------------------------------
// Import AFTER mocks are installed
// ---------------------------------------------------------------------------

import {
  getTechniqueIconDataURL,
  getCharacterPortraitDataURL,
  clearAllCaches,
} from '../src/utils/pixelSpriteGenerator';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getTechniqueIconDataURL — icon routing', () => {
  it('returns a data URL for a fire technique (flame_slash)', () => {
    const url = getTechniqueIconDataURL('flame_slash');
    expect(url).toBeTruthy();
    expect(url).toContain('data:');
  });

  it('returns a data URL for a wind technique (swift_wind)', () => {
    const url = getTechniqueIconDataURL('swift_wind');
    expect(url).toBeTruthy();
    expect(url).toContain('data:');
  });

  it('returns a data URL for a void technique (void_step)', () => {
    const url = getTechniqueIconDataURL('void_step');
    expect(url).toBeTruthy();
    expect(url).toContain('data:');
  });

  it('returns a data URL for a light technique (heavenly_blade)', () => {
    const url = getTechniqueIconDataURL('heavenly_blade');
    expect(url).toBeTruthy();
    expect(url).toContain('data:');
  });

  it('falls back to meditation icon for an unknown technique id', () => {
    const url = getTechniqueIconDataURL('nonexistent_technique_xyz');
    expect(url).toBeTruthy();
    expect(url).toContain('data:');
  });
});

describe('getTechniqueIconDataURL — caching', () => {
  beforeEach(() => {
    // Ensure a clean cache for this describe block
    clearAllCaches();
  });

  it('returns cached result on duplicate call (toDataURL called only once)', () => {
    const spy = uniqueDataURLSpy();
    (globalThis as any).document.createElement = () => makeMockCanvas(spy);

    const url1 = getTechniqueIconDataURL('flame_slash');
    const callsAfterFirst = spy.mock.calls.length;

    const url2 = getTechniqueIconDataURL('flame_slash');
    const callsAfterSecond = spy.mock.calls.length;

    // Second call should NOT call toDataURL again
    expect(callsAfterSecond).toBe(callsAfterFirst);
    expect(url1).toBe(url2);
  });
});

describe('getCharacterPortraitDataURL', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it('returns a data URL string for valid realm/bodyType/role inputs', () => {
    const url = getCharacterPortraitDataURL('凡人', '凡体', '散修');
    // Note: in the mocked environment we get back our mock data URL
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
    expect(url).toContain('data:');
  });

  it('returns cached value on duplicate key (toDataURL called only once)', () => {
    const spy = uniqueDataURLSpy();
    (globalThis as any).document.createElement = () => makeMockCanvas(spy);

    const url1 = getCharacterPortraitDataURL('筑基', '灵体', '剑修');
    const callsAfterFirst = spy.mock.calls.length;

    const url2 = getCharacterPortraitDataURL('筑基', '灵体', '剑修');
    const callsAfterSecond = spy.mock.calls.length;

    expect(callsAfterSecond).toBe(callsAfterFirst);
    expect(url1).toBe(url2);
  });
});

describe('clearAllCaches', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it('forces technique icon to regenerate after clear', () => {
    const spy = uniqueDataURLSpy();
    (globalThis as any).document.createElement = () => makeMockCanvas(spy);

    // First call — populates cache, calls toDataURL once
    getTechniqueIconDataURL('earth_shaker');
    const callsAfterFirst = spy.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

    clearAllCaches();

    // Second call after cache cleared — should call toDataURL again
    getTechniqueIconDataURL('earth_shaker');
    const callsAfterSecond = spy.mock.calls.length;
    expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
  });

  it('forces portrait to regenerate after clear', () => {
    const spy = uniqueDataURLSpy();
    (globalThis as any).document.createElement = () => makeMockCanvas(spy);

    getCharacterPortraitDataURL('金丹', '道体', '阵修');
    const callsAfterFirst = spy.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

    clearAllCaches();

    getCharacterPortraitDataURL('金丹', '道体', '阵修');
    const callsAfterSecond = spy.mock.calls.length;
    expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
  });
});

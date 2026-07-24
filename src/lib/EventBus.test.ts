import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('vitest is configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('fast-check is available', async () => {
    const fc = await import('fast-check');
    expect(fc).toBeDefined();
    expect(typeof fc.assert).toBe('function');
  });

  it('path alias @/ resolves correctly', async () => {
    const types = await import('@/types/index');
    expect(types).toBeDefined();
  });
});

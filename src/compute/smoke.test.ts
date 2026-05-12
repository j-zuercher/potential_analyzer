// Phase 9 environment smoke. Real coverage lives in compute.test.ts (brick 9).
import { describe, it, expect } from 'vitest';
describe('environment', () => {
  it('vitest is wired', () => expect(true).toBe(true));
});

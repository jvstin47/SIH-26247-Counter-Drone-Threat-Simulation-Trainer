import { describe, expect, it } from 'vitest';
import { generateScenario } from '../src/simulation/scenarios';
import { validateScenario } from '../src/simulation/validation';

describe('scenario validation', () => {
  it('accepts complete valid scenario DNA', () => expect(validateScenario(generateScenario(42)).seed).toBe(42));
  it('rejects invalid entity count', () => expect(() => validateScenario({ ...generateScenario(42), entityCount: 500 })).toThrow(/Entity count/));
  it('rejects unsupported environment', () => expect(() => validateScenario({ ...generateScenario(42), environment: 'SECRET_BASE' })).toThrow(/environment/));
  it('accepts seed zero', () => expect(validateScenario({ ...generateScenario(42), seed: 0 }).seed).toBe(0));
});

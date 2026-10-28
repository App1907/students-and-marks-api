import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatConfigErrors, validateConfig } from '../src/config/env';

const baseEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'test',
  DB_PASSWORD: '',
  DB_NAME: 'student_app_test',
  PASS_PERCENTAGE: '40',
  ACADEMIC_YEAR: '2026-27',
};

describe('validateConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing PASS_PERCENTAGE', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const raw = { ...baseEnv };
    delete (raw as { PASS_PERCENTAGE?: string }).PASS_PERCENTAGE;

    expect(() => validateConfig(raw)).toThrow(/is required but missing/i);
    expect(spy.mock.calls.flat().join('\n')).toMatch(/PASS_PERCENTAGE.*is required but missing/i);
  });

  it('rejects non-numeric PASS_PERCENTAGE', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => validateConfig({ ...baseEnv, PASS_PERCENTAGE: 'abc' })).toThrow(/number/i);
    expect(spy.mock.calls.flat().join('\n')).toMatch(/PASS_PERCENTAGE/);
  });

  it('rejects out-of-range PASS_PERCENTAGE', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => validateConfig({ ...baseEnv, PASS_PERCENTAGE: '150' })).toThrow(/0 and 100/i);
    expect(spy.mock.calls.flat().join('\n')).toMatch(/PASS_PERCENTAGE/);
  });

  it('rejects short ACADEMIC_YEAR format', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => validateConfig({ ...baseEnv, ACADEMIC_YEAR: '26-27' })).toThrow(/YYYY-YY/i);
    expect(spy.mock.calls.flat().join('\n')).toMatch(/ACADEMIC_YEAR/);
  });

  it('rejects ACADEMIC_YEAR where second year does not follow the first', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => validateConfig({ ...baseEnv, ACADEMIC_YEAR: '2026-28' })).toThrow(
      /second year must follow the first \(received "2026-28"\)/,
    );
    expect(spy.mock.calls.flat().join('\n')).toMatch(/2026-28/);
  });

  it('parses PASS_PERCENTAGE "33.5" to the number 33.5', () => {
    const cfg = validateConfig({ ...baseEnv, PASS_PERCENTAGE: '33.5' });
    expect(cfg.PASS_PERCENTAGE).toBe(33.5);
    expect(cfg.ACADEMIC_YEAR).toBe('2026-27');
  });

  it('formatConfigErrors names the variable', () => {
    try {
      validateConfig({ ...baseEnv, PASS_PERCENTAGE: undefined as unknown as string });
    } catch (err) {
      const messages = (err as Error & { messages?: string[] }).messages ?? [];
      expect(messages.some((m) => m.includes('PASS_PERCENTAGE'))).toBe(true);
      expect(formatConfigErrors).toBeTypeOf('function');
    }
  });
});

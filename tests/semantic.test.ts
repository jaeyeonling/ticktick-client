import { describe, it, expect } from 'vitest';
import {
  parseTaskPriority,
  formatTaskPriority,
  parseTaskStatus,
  formatTaskStatus,
  parseHabitStatus,
  formatHabitStatus,
  parseCheckinStatus,
  formatCheckinStatus,
} from '../src/semantic.js';

describe('parseTaskPriority', () => {
  it('should parse string aliases', () => {
    expect(parseTaskPriority('none')).toBe(0);
    expect(parseTaskPriority('low')).toBe(1);
    expect(parseTaskPriority('medium')).toBe(3);
    expect(parseTaskPriority('high')).toBe(5);
  });

  it('should pass through valid numbers', () => {
    expect(parseTaskPriority(0)).toBe(0);
    expect(parseTaskPriority(1)).toBe(1);
    expect(parseTaskPriority(3)).toBe(3);
    expect(parseTaskPriority(5)).toBe(5);
  });

  it('should return undefined for unknown input', () => {
    expect(parseTaskPriority('critical')).toBeUndefined();
    expect(parseTaskPriority(2 as never)).toBeUndefined();
  });
});

describe('formatTaskPriority', () => {
  it('should format all valid values', () => {
    expect(formatTaskPriority(0)).toBe('none');
    expect(formatTaskPriority(1)).toBe('low');
    expect(formatTaskPriority(3)).toBe('medium');
    expect(formatTaskPriority(5)).toBe('high');
  });
});

describe('parseTaskStatus', () => {
  it('should parse string aliases', () => {
    expect(parseTaskStatus('open')).toBe(0);
    expect(parseTaskStatus('completed')).toBe(2);
    expect(parseTaskStatus("won't do")).toBe(-1);
    expect(parseTaskStatus('abandoned')).toBe(-1);
  });

  it('should pass through valid numbers', () => {
    expect(parseTaskStatus(0)).toBe(0);
    expect(parseTaskStatus(2)).toBe(2);
    expect(parseTaskStatus(-1)).toBe(-1);
  });

  it('should return undefined for unknown input', () => {
    expect(parseTaskStatus('pending')).toBeUndefined();
    expect(parseTaskStatus(99 as never)).toBeUndefined();
  });
});

describe('formatTaskStatus', () => {
  it('should format all valid values', () => {
    expect(formatTaskStatus(0)).toBe('open');
    expect(formatTaskStatus(2)).toBe('completed');
    expect(formatTaskStatus(-1)).toBe('abandoned');
  });
});

describe('parseHabitStatus', () => {
  it('should parse string aliases', () => {
    expect(parseHabitStatus('normal')).toBe(0);
    expect(parseHabitStatus('archived')).toBe(1);
  });

  it('should pass through valid numbers', () => {
    expect(parseHabitStatus(0)).toBe(0);
    expect(parseHabitStatus(1)).toBe(1);
  });

  it('should return undefined for unknown input', () => {
    expect(parseHabitStatus('deleted')).toBeUndefined();
    expect(parseHabitStatus(2 as never)).toBeUndefined();
  });
});

describe('formatHabitStatus', () => {
  it('should format all valid values', () => {
    expect(formatHabitStatus(0)).toBe('normal');
    expect(formatHabitStatus(1)).toBe('archived');
  });
});

describe('parseCheckinStatus', () => {
  it('should parse string aliases', () => {
    expect(parseCheckinStatus('unlabeled')).toBe(0);
    expect(parseCheckinStatus('undone')).toBe(1);
    expect(parseCheckinStatus('done')).toBe(2);
  });

  it('should pass through valid numbers', () => {
    expect(parseCheckinStatus(0)).toBe(0);
    expect(parseCheckinStatus(1)).toBe(1);
    expect(parseCheckinStatus(2)).toBe(2);
  });

  it('should return undefined for unknown input', () => {
    expect(parseCheckinStatus('skipped')).toBeUndefined();
    expect(parseCheckinStatus(3 as never)).toBeUndefined();
  });
});

describe('formatCheckinStatus', () => {
  it('should format all valid values', () => {
    expect(formatCheckinStatus(0)).toBe('unlabeled');
    expect(formatCheckinStatus(1)).toBe('undone');
    expect(formatCheckinStatus(2)).toBe('done');
  });
});

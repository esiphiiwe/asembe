import {
  formatActivityDate,
  formatRecurrenceRule,
  formatActivitySchedule,
} from '@/lib/activity-utils';

describe('formatActivityDate', () => {
  it('returns "Recurring" when date is null', () => {
    expect(formatActivityDate(null)).toBe('Recurring');
  });

  it('returns "Recurring" when date is undefined', () => {
    expect(formatActivityDate(undefined)).toBe('Recurring');
  });

  it('formats a valid ISO date string', () => {
    const result = formatActivityDate('2026-05-01T17:30:00');
    expect(result).toMatch(/Fri, May 1/);
    expect(result).toMatch(/5:30 PM/);
  });

  it('formats AM times correctly', () => {
    const result = formatActivityDate('2026-05-01T09:05:00');
    expect(result).toMatch(/9:05 AM/);
  });

  it('formats 12 PM (noon) correctly', () => {
    const result = formatActivityDate('2026-05-01T12:00:00');
    expect(result).toMatch(/12:00 PM/);
  });

  it('formats midnight as 12:00 AM', () => {
    const result = formatActivityDate('2026-05-01T00:00:00');
    expect(result).toMatch(/12:00 AM/);
  });

  it('accepts a Date object', () => {
    const result = formatActivityDate(new Date('2026-05-01T17:30:00'));
    expect(result).toContain('May');
  });
});

describe('formatRecurrenceRule', () => {
  it('returns "Recurring" for null', () => {
    expect(formatRecurrenceRule(null)).toBe('Recurring');
  });

  it('returns "Recurring" for undefined', () => {
    expect(formatRecurrenceRule(undefined)).toBe('Recurring');
  });

  it('capitalises and formats weekly:friday', () => {
    expect(formatRecurrenceRule('weekly:friday')).toBe('Every Friday');
  });

  it('capitalises and formats weekly:monday', () => {
    expect(formatRecurrenceRule('weekly:monday')).toBe('Every Monday');
  });

  it('returns "Recurring" for malformed rule without colon', () => {
    expect(formatRecurrenceRule('weekly')).toBe('Recurring');
  });
});

describe('formatActivitySchedule', () => {
  it('returns formatted date when dateTime is provided', () => {
    const result = formatActivitySchedule('2026-05-01T17:30:00', null);
    expect(result).toMatch(/May 1/);
  });

  it('falls back to recurrence rule when dateTime is null', () => {
    expect(formatActivitySchedule(null, 'weekly:friday')).toBe('Every Friday');
  });

  it('returns "Recurring" when both are null', () => {
    expect(formatActivitySchedule(null, null)).toBe('Recurring');
  });
});

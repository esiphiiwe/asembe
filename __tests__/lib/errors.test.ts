import { getErrorMessage, isDuplicateError } from '@/lib/errors';

describe('getErrorMessage', () => {
  it('returns the message from an Error instance', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns the message from a plain object with a message property', () => {
    expect(getErrorMessage({ message: 'oops' }, 'fallback')).toBe('oops');
  });

  it('returns the fallback when error has no message', () => {
    expect(getErrorMessage({}, 'fallback')).toBe('fallback');
  });

  it('returns the fallback for null', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('returns the fallback for undefined', () => {
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('returns the fallback for a number', () => {
    expect(getErrorMessage(42, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when message is an empty string', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
  });
});

describe('isDuplicateError', () => {
  it('returns true for Postgres unique violation code 23505', () => {
    expect(isDuplicateError({ code: '23505' })).toBe(true);
  });

  it('returns true when message contains "duplicate"', () => {
    expect(isDuplicateError({ message: 'duplicate key value' })).toBe(true);
  });

  it('is case-insensitive for the "duplicate" message check', () => {
    expect(isDuplicateError({ message: 'DUPLICATE entry found' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isDuplicateError({ code: '42P01', message: 'table not found' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDuplicateError(null)).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isDuplicateError('some string')).toBe(false);
  });
});

import { SupabaseConfigError, SupabaseSetupError } from '@/lib/supabase';

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

export function isConfigError(error: unknown): error is SupabaseConfigError {
  return error instanceof SupabaseConfigError;
}

export function isSetupError(error: unknown): error is SupabaseConfigError | SupabaseSetupError {
  return error instanceof SupabaseConfigError || error instanceof SupabaseSetupError;
}

export function isDuplicateError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = 'code' in error ? (error as { code?: unknown }).code : null;
  const message = 'message' in error ? (error as { message?: unknown }).message : null;

  return code === '23505' || (typeof message === 'string' && message.toLowerCase().includes('duplicate'));
}

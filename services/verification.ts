import { getSupabaseClient } from '@/lib/supabase';

export interface StartVerificationResult {
  sessionUrl: string;
  sessionId: string;
}

/**
 * Creates a Veriff identity verification session for the current user.
 * Returns the hosted session URL that should be opened in an in-app browser.
 * Throws if Veriff is not configured (VERIFF_API_KEY missing) or the
 * Edge Function returns an error.
 */
export async function startVerification(): Promise<StartVerificationResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke<StartVerificationResult>(
    'start-verification',
    { method: 'POST' }
  );

  if (error) {
    throw new Error(error.message ?? 'Failed to start verification');
  }

  if (!data?.sessionUrl || !data?.sessionId) {
    throw new Error('Invalid response from verification service');
  }

  return data;
}

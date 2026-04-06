import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Veriff decision values that indicate identity confirmed
const APPROVED_DECISIONS = new Set(['approved']);

// Veriff signs webhook payloads with HMAC-SHA256 using the API key as the secret.
// The signature is delivered in the X-HMAC-SIGNATURE header (hex-encoded).
async function verifyHmac(secret: string, payload: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const computed = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    // Constant-time comparison to prevent timing attacks
    if (computed.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Veriff sends POST requests; reject everything else
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const veriffApiKey = Deno.env.get('VERIFF_API_KEY');
  if (!veriffApiKey) {
    console.error('[veriff-webhook] VERIFF_API_KEY not set');
    return new Response('Service unavailable', { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-hmac-signature') ?? '';

  // Verify the payload came from Veriff
  const isValid = await verifyHmac(veriffApiKey, rawBody, signature);
  if (!isValid) {
    console.warn('[veriff-webhook] HMAC verification failed');
    return new Response('Forbidden', { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Veriff sends either a "decision" event or a "session" event.
  // We care about the decision object which contains the verification outcome.
  const verification = (payload.verification ?? payload.data?.verification) as Record<string, unknown> | undefined;
  const sessionId = (verification?.id ?? payload.id) as string | undefined;
  const decision = (
    (verification?.decision as Record<string, unknown>)?.status ??
    verification?.status ??
    payload.status
  ) as string | undefined;

  if (!sessionId) {
    console.warn('[veriff-webhook] No session ID in payload:', JSON.stringify(payload));
    // Acknowledge receipt so Veriff doesn't retry
    return new Response('ok', { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Map the normalised decision string back to our status enum
  const normalised = (decision ?? '').toLowerCase();
  const statusMap: Record<string, string> = {
    approved: 'approved',
    declined: 'declined',
    resubmission_requested: 'resubmission_requested',
    expired: 'expired',
    abandoned: 'abandoned',
  };
  const dbStatus = statusMap[normalised] ?? null;

  // Update our audit row if we can map the status
  if (dbStatus) {
    const { error: updateSessionError } = await supabase
      .from('veriff_sessions')
      .update({ status: dbStatus })
      .eq('session_id', sessionId);

    if (updateSessionError) {
      console.warn('[veriff-webhook] Failed to update veriff_sessions:', updateSessionError.message);
    }
  }

  // If approved, mark the profile as verified
  if (APPROVED_DECISIONS.has(normalised)) {
    const { data: session } = await supabase
      .from('veriff_sessions')
      .select('user_id')
      .eq('session_id', sessionId)
      .single();

    if (!session?.user_id) {
      console.error('[veriff-webhook] No matching session for session_id:', sessionId);
      return new Response('ok', { status: 200 });
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ verified: true })
      .eq('id', session.user_id);

    if (profileError) {
      console.error('[veriff-webhook] Failed to set verified on profile:', profileError.message);
      // Return 500 so Veriff retries
      return new Response('Internal error', { status: 500 });
    }

    console.log('[veriff-webhook] Profile verified for user:', session.user_id);
  }

  return new Response('ok', { status: 200 });
});

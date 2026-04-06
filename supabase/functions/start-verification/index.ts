import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERIFF_BASE_URL = 'https://stationapi.veriff.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const veriffApiKey = Deno.env.get('VERIFF_API_KEY');
    if (!veriffApiKey) {
      return new Response(JSON.stringify({ error: 'Veriff not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller's JWT and get their user record
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch profile to get name and existing verified status
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('name, verified')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.verified) {
      return new Response(JSON.stringify({ error: 'Already verified' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the webhook callback URL so Veriff can notify us on completion
    const webhookUrl = `${supabaseUrl}/functions/v1/veriff-webhook`;

    // Split name into first/last for Veriff (best effort)
    const nameParts = (profile.name ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Create a Veriff session
    const veriffRes = await fetch(`${VERIFF_BASE_URL}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': veriffApiKey,
      },
      body: JSON.stringify({
        verification: {
          callback: webhookUrl,
          person: {
            firstName,
            ...(lastName ? { lastName } : {}),
          },
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!veriffRes.ok) {
      const errText = await veriffRes.text();
      console.error('[start-verification] Veriff API error:', veriffRes.status, errText);
      return new Response(JSON.stringify({ error: 'Failed to create verification session' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const veriffData = await veriffRes.json();
    const sessionId: string = veriffData.verification?.id;
    const sessionUrl: string = veriffData.verification?.url;

    if (!sessionId || !sessionUrl) {
      console.error('[start-verification] Unexpected Veriff response:', veriffData);
      return new Response(JSON.stringify({ error: 'Invalid Veriff response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Persist the session so the webhook can map session_id → user_id
    const { error: insertError } = await serviceClient
      .from('veriff_sessions')
      .insert({ user_id: user.id, session_id: sessionId, status: 'created' });

    if (insertError) {
      // Non-fatal: log but still return the URL — webhook will still fire
      console.warn('[start-verification] Failed to insert veriff_sessions row:', insertError.message);
    }

    return new Response(
      JSON.stringify({ sessionUrl, sessionId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[start-verification] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload =
  | { type: 'match_request'; activityId: string; requesterId: string }
  | { type: 'match_response'; requesterId: string; status: 'accepted' | 'declined'; activityTitle: string }
  | { type: 'new_message'; matchId: string; senderId: string };

interface NotificationContent {
  recipientId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function resolveNotification(
  supabase: ReturnType<typeof createClient>,
  payload: Payload
): Promise<NotificationContent | null> {
  if (payload.type === 'match_request') {
    // Notify the activity poster
    const { data: activity } = await supabase
      .from('activities')
      .select('user_id, title, profiles!activities_user_id_fkey(name)')
      .eq('id', payload.activityId)
      .single();

    if (!activity) return null;

    const { data: requester } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', payload.requesterId)
      .single();

    return {
      recipientId: activity.user_id,
      title: 'New join request',
      body: `${requester?.name ?? 'Someone'} wants to join "${activity.title}"`,
      data: { type: 'match_request', activityId: payload.activityId },
    };
  }

  if (payload.type === 'match_response') {
    // Notify the requester whether their request was accepted or declined
    const isAccepted = payload.status === 'accepted';
    return {
      recipientId: payload.requesterId,
      title: isAccepted ? 'Request accepted!' : 'Request update',
      body: isAccepted
        ? `Your request to join "${payload.activityTitle}" was accepted. Chat is now open.`
        : `Your request for "${payload.activityTitle}" wasn't accepted this time.`,
      data: { type: 'match_response', status: payload.status },
    };
  }

  if (payload.type === 'new_message') {
    // Notify the other participant in the match
    const { data: match } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', payload.matchId)
      .single();

    if (!match) return null;

    const recipientId =
      match.user1_id === payload.senderId ? match.user2_id : match.user1_id;

    const { data: sender } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', payload.senderId)
      .single();

    return {
      recipientId,
      title: sender?.name ?? 'New message',
      body: 'You have a new message',
      data: { type: 'new_message', matchId: payload.matchId },
    };
  }

  return null;
}

async function sendPushNotifications(
  supabase: ReturnType<typeof createClient>,
  recipientId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', recipientId);

  if (!tokens || tokens.length === 0) return 0;

  const messages = tokens.map(({ token }) => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: 'default',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error('Expo push API error:', await response.text());
    return 0;
  }

  return tokens.length;
}

async function sendEmailNotification(
  supabase: ReturnType<typeof createClient>,
  recipientId: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', recipientId)
    .single();

  if (!profile?.email) return false;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Asambe <noreply@asambe.app>',
      to: [profile.email],
      subject,
      html: htmlBody,
    }),
  });

  return response.ok;
}

function buildEmailHtml(title: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9; color: #1c1917;">
        <h2 style="font-size: 22px; margin-bottom: 12px;">${title}</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #57534e;">${body}</p>
        <p style="margin-top: 32px; font-size: 13px; color: #a8a29e;">
          Open the Asambe app to respond.
        </p>
      </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for reading recipient data (tokens, preferences, profiles)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload: Payload = await req.json();
    const notification = await resolveNotification(supabase, payload);

    if (!notification) {
      return new Response(JSON.stringify({ sent: 0, reason: 'unresolved' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check notification preferences for recipient
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_enabled, email_enabled')
      .eq('id', notification.recipientId)
      .single();

    let pushSent = 0;
    let emailSent = false;

    if (profile?.push_enabled !== false) {
      pushSent = await sendPushNotifications(
        supabase,
        notification.recipientId,
        notification.title,
        notification.body,
        notification.data
      );
    }

    if (profile?.email_enabled === true) {
      emailSent = await sendEmailNotification(
        supabase,
        notification.recipientId,
        notification.title,
        buildEmailHtml(notification.title, notification.body)
      );
    }

    return new Response(
      JSON.stringify({ pushSent, emailSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('send-notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

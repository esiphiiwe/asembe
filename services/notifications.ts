import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

async function invoke(body: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.functions.invoke('send-notification', { body });
    if (error) {
      console.warn('[notifications] invoke error:', error.message);
    }
  } catch (err) {
    // Notifications are best-effort — never propagate failures to callers
    console.warn('[notifications] dispatch error:', err);
  }
}

/** Notify the activity poster that someone wants to join. */
export async function notifyMatchRequest(
  activityId: string,
  requesterId: string
): Promise<void> {
  await invoke({ type: 'match_request', activityId, requesterId });
}

/** Notify the requester whether their request was accepted or declined. */
export async function notifyMatchResponse(
  requesterId: string,
  status: 'accepted' | 'declined',
  activityTitle: string
): Promise<void> {
  await invoke({ type: 'match_response', requesterId, status, activityTitle });
}

/** Notify the other participant in a match chat about a new message. */
export async function notifyNewMessage(
  matchId: string,
  senderId: string
): Promise<void> {
  await invoke({ type: 'new_message', matchId, senderId });
}

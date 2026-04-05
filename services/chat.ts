import { getSupabaseClient } from '@/lib/supabase';

export interface ChatMessageView {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
}

function mapChatMessage(message: {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
}, currentUserId: string): ChatMessageView {
  return {
    id: message.id,
    text: message.text,
    timestamp: new Date(message.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    isSent: message.sender_id === currentUserId,
  };
}

export async function getMessages(matchId: string, currentUserId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(message => mapChatMessage(message, currentUserId));
}

export async function sendMessage(matchId: string, senderId: string, text: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ match_id: matchId, sender_id: senderId, text })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToMessages(
  matchId: string,
  currentUserId: string,
  onMessage: (message: ChatMessageView) => void,
  onStatusChange?: (status: string) => void
) {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`chat:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        onMessage(mapChatMessage(payload.new as any, currentUserId));
      }
    )
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

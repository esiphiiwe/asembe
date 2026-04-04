import { supabase } from '@/lib/supabase';

export async function getMessages(matchId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(matchId: string, senderId: string, text: string) {
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
  onMessage: (message: any) => void
) {
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
        onMessage(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type TrustedContact = Database['public']['Tables']['user_trusted_contacts']['Row'];

export interface TrustedContactView {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface BlockedUserView {
  id: string;
  blockedId: string;
  blockedName: string;
  blockedPhoto: string | null;
  createdAt: string;
}

// ─── Block / Unblock ─────────────────────────────────────────────────────────

export async function blockUser(blockerId: string, blockedId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) throw error;
}

export async function getBlockedUsers(userId: string): Promise<BlockedUserView[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_blocks')
    .select(`
      id,
      blocked_id,
      created_at,
      blocked:profiles!user_blocks_blocked_id_fkey ( name, profile_photo )
    `)
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    blockedId: row.blocked_id,
    blockedName: row.blocked?.name ?? 'Unknown',
    blockedPhoto: row.blocked?.profile_photo ?? null,
    createdAt: row.created_at,
  }));
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: string,
  contextType?: 'match' | 'activity',
  contextId?: string,
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_reports')
    .insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      context_type: contextType ?? null,
      context_id: contextId ?? null,
    });

  if (error) throw error;
}

// ─── Trusted contacts ────────────────────────────────────────────────────────

export async function getTrustedContacts(userId: string): Promise<TrustedContactView[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_trusted_contacts')
    .select('id, name, phone, email')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: TrustedContact) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
  }));
}

export async function saveTrustedContact(
  userId: string,
  name: string,
  phone?: string,
  email?: string,
) {
  if (!phone && !email) {
    throw new Error('A trusted contact must have at least a phone number or email address.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_trusted_contacts')
    .insert({
      user_id: userId,
      name,
      phone: phone ?? null,
      email: email ?? null,
    })
    .select('id, name, phone, email')
    .single();

  if (error) throw error;
  return data as TrustedContactView;
}

export async function removeTrustedContact(contactId: string, userId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_trusted_contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', userId);

  if (error) throw error;
}

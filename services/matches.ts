import { formatActivitySchedule } from '@/lib/activity-utils';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type MatchRow = Database['public']['Tables']['matches']['Row'];

export interface PendingMatchRequestView {
  id: string;
  activityId: string;
  requesterId: string;
  activityTitle: string;
  categoryIcon: string;
  categoryName: string;
  neighborhood: string;
  dateLabel: string;
  companionName: string;
  companionTrustScore: number;
}

export interface MatchListItemView {
  id: string;
  activityId: string;
  status: MatchRow['status'];
  companionId: string;
  companionName: string;
  companionTrustScore: number;
  companionPhoto: string | null;
  activityTitle: string;
  categoryName: string;
  categoryIcon: string;
  neighborhood: string;
  dateTime: string | null;
  recurrenceRule: string | null;
  dateLabel: string;
}

export type MatchDetailView = MatchListItemView;

function mapMatchListItem(match: any, currentUserId: string): MatchListItemView {
  const companion = match.user1?.id === currentUserId ? match.user2 : match.user1;
  const dateTime = match.activities?.date_time ?? null;
  const recurrenceRule = match.activities?.recurrence_rule ?? null;

  return {
    id: match.id,
    activityId: match.activity_id,
    status: match.status,
    companionId: companion?.id ?? '',
    companionName: companion?.name ?? 'Unknown',
    companionTrustScore: companion?.trust_score ?? 0,
    companionPhoto: companion?.profile_photo ?? null,
    activityTitle: match.activities?.title ?? '',
    categoryName: match.activities?.categories?.name ?? 'other',
    categoryIcon: match.activities?.categories?.icon ?? '✨',
    neighborhood: match.activities?.neighborhood ?? '',
    dateTime,
    recurrenceRule,
    dateLabel: formatActivitySchedule(dateTime, recurrenceRule),
  };
}

export async function createMatchRequest(activityId: string, requesterId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('match_requests')
    .insert({ activity_id: activityId, requester_id: requesterId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingRequestsForUser(userId: string) {
  const supabase = getSupabaseClient();
  const { data: activityRows, error: activityError } = await supabase
    .from('activities')
    .select('id')
    .eq('user_id', userId);

  if (activityError) throw activityError;

  const activityIds = (activityRows ?? []).map(row => row.id);
  if (activityIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('match_requests')
    .select(`
      *,
      activities!match_requests_activity_id_fkey (
        id, title, neighborhood, date_time, companion_count,
        categories!activities_category_id_fkey ( name, icon )
      ),
      profiles!match_requests_requester_id_fkey ( name, trust_score, profile_photo )
    `)
    .eq('status', 'pending')
    .in('activity_id', activityIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((request: any) => ({
    id: request.id,
    activityId: request.activity_id,
    requesterId: request.requester_id,
    activityTitle: request.activities?.title ?? 'Activity',
    categoryIcon: request.activities?.categories?.icon ?? '✨',
    categoryName: request.activities?.categories?.name ?? 'other',
    neighborhood: request.activities?.neighborhood ?? '',
    dateLabel: formatActivitySchedule(
      request.activities?.date_time ?? null,
      request.activities?.recurrence_rule ?? null
    ),
    companionName: request.profiles?.name ?? 'Unknown',
    companionTrustScore: request.profiles?.trust_score ?? 0,
  })) as PendingMatchRequestView[];
}

export async function getOutgoingRequests(userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('match_requests')
    .select(`
      *,
      activities!match_requests_activity_id_fkey (
        id, title, neighborhood, date_time,
        categories!activities_category_id_fkey ( name, icon ),
        profiles!activities_user_id_fkey ( name )
      )
    `)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function respondToRequest(
  requestId: string,
  status: 'accepted' | 'declined',
  activityId?: string,
  requesterId?: string,
  posterId?: string
) {
  const supabase = getSupabaseClient();
  const { error: updateError } = await supabase
    .from('match_requests')
    .update({ status })
    .eq('id', requestId);

  if (updateError) throw updateError;

  if (status === 'accepted' && activityId && requesterId && posterId) {
    const { error: matchError } = await supabase
      .from('matches')
      .insert({
        activity_id: activityId,
        user1_id: posterId,
        user2_id: requesterId,
        status: 'confirmed',
      });

    if (matchError) throw matchError;
  }
}

export async function getUserMatches(userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      activities!matches_activity_id_fkey (
        title, neighborhood, date_time, recurrence_rule,
        categories!activities_category_id_fkey ( name, icon )
      ),
      user1:profiles!matches_user1_id_fkey ( id, name, trust_score, profile_photo ),
      user2:profiles!matches_user2_id_fkey ( id, name, trust_score, profile_photo )
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((match: any) => mapMatchListItem(match, userId));
}

export async function getMatchById(matchId: string, currentUserId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      activities!matches_activity_id_fkey (
        title, neighborhood, date_time, recurrence_rule,
        categories!activities_category_id_fkey ( name, icon )
      ),
      user1:profiles!matches_user1_id_fkey ( id, name, trust_score, profile_photo ),
      user2:profiles!matches_user2_id_fkey ( id, name, trust_score, profile_photo )
    `)
    .eq('id', matchId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('This match is no longer available.');
  }

  return mapMatchListItem(data, currentUserId);
}

export async function updateMatchStatus(matchId: string, status: 'completed' | 'cancelled') {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('matches')
    .update({ status })
    .eq('id', matchId);

  if (error) throw error;
}

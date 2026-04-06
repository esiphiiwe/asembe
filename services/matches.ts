import { formatActivitySchedule } from '@/lib/activity-utils';
import { calculateMatchScore } from '@/lib/match-score';
import { getSupabaseClient } from '@/lib/supabase';
import { canSendMatchRequest } from '@/services/subscriptions';
import { notifyMatchRequest, notifyMatchResponse } from '@/services/notifications';
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
  score: number | null;
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
  chatExpiresAt: string | null;
  /** Whether the current user (caller) has opted to keep this chat open */
  currentUserKeepOpen: boolean;
  /** Whether the companion has opted to keep this chat open */
  companionKeepOpen: boolean;
}

export type MatchDetailView = MatchListItemView;

function mapMatchListItem(match: any, currentUserId: string): MatchListItemView {
  const isUser1 = match.user1?.id === currentUserId;
  const companion = isUser1 ? match.user2 : match.user1;
  const dateTime = match.activities?.date_time ?? null;
  const recurrenceRule = match.activities?.recurrence_rule ?? null;
  const keepOpenUser1: boolean = match.keep_open_user1 ?? false;
  const keepOpenUser2: boolean = match.keep_open_user2 ?? false;

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
    chatExpiresAt: match.chat_expires_at ?? null,
    currentUserKeepOpen: isUser1 ? keepOpenUser1 : keepOpenUser2,
    companionKeepOpen: isUser1 ? keepOpenUser2 : keepOpenUser1,
  };
}

export async function createMatchRequest(activityId: string, requesterId: string) {
  const supabase = getSupabaseClient();

  // Fetch all data needed for the hard filters and score calculation in parallel.
  const [
    requestCheck,
    { data: activity, error: activityError },
    { data: requester, error: requesterError },
  ] = await Promise.all([
    canSendMatchRequest(requesterId),
    supabase
      .from('activities')
      .select('women_only, date_time, recurrence_rule, city, category_id, user_id')
      .eq('id', activityId)
      .single(),
    supabase
      .from('profiles')
      .select('gender, age, trust_score, city')
      .eq('id', requesterId)
      .single(),
  ]);

  if (!requestCheck.allowed) {
    throw new Error(requestCheck.reason ?? 'You have reached your monthly match request limit.');
  }
  if (activityError) throw activityError;
  if (requesterError) throw requesterError;

  if (activity?.women_only && requester?.gender !== 'woman') {
    throw new Error('This activity is open to women companions only.');
  }

  // Fetch additional data for scoring (non-blocking failures fall back to null).
  const posterId = activity!.user_id;
  const categoryId = activity!.category_id;

  const [
    { data: poster },
    { data: posterPref },
    { data: requesterPref },
    { data: badReviews },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('age, trust_score')
      .eq('id', posterId)
      .maybeSingle(),
    supabase
      .from('user_activity_preferences')
      .select('preferred_age_range_min, preferred_age_range_max')
      .eq('user_id', posterId)
      .eq('category_id', categoryId)
      .maybeSingle(),
    supabase
      .from('user_activity_preferences')
      .select('preferred_age_range_min, preferred_age_range_max')
      .eq('user_id', requesterId)
      .eq('category_id', categoryId)
      .maybeSingle(),
    // Check for any low rating (≤ 2) between this pair in either direction.
    supabase
      .from('reviews')
      .select('id')
      .or(
        `and(reviewer_id.eq.${requesterId},reviewee_id.eq.${posterId}),` +
        `and(reviewer_id.eq.${posterId},reviewee_id.eq.${requesterId})`
      )
      .lte('rating', 2)
      .limit(1),
  ]);

  const score = calculateMatchScore({
    requesterAge: requester!.age,
    requesterTrustScore: requester!.trust_score,
    requesterCity: requester!.city,
    requesterPreference: requesterPref
      ? {
          preferredAgeRangeMin: requesterPref.preferred_age_range_min,
          preferredAgeRangeMax: requesterPref.preferred_age_range_max,
        }
      : null,
    posterAge: poster?.age ?? 25,
    posterTrustScore: poster?.trust_score ?? 0,
    posterPreference: posterPref
      ? {
          preferredAgeRangeMin: posterPref.preferred_age_range_min,
          preferredAgeRangeMax: posterPref.preferred_age_range_max,
        }
      : null,
    activityCity: activity!.city,
    activityDateTime: activity!.date_time,
    hasBadPriorHistory: (badReviews?.length ?? 0) > 0,
  });

  const { data, error } = await supabase
    .from('match_requests')
    .insert({ activity_id: activityId, requester_id: requesterId, score })
    .select()
    .single();

  if (error) throw error;

  void notifyMatchRequest(activityId, requesterId);

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

  const selectQuery = `
      *,
      activities!match_requests_activity_id_fkey (
        id, title, neighborhood, date_time, recurrence_rule, companion_count,
        categories!activities_category_id_fkey ( name, icon )
      ),
      profiles!match_requests_requester_id_fkey ( name, trust_score, profile_photo )
    `;

  let { data, error } = await supabase
    .from('match_requests')
    .select(selectQuery)
    .eq('status', 'pending')
    .in('activity_id', activityIds)
    .order('score', { ascending: false, nullsFirst: false });

  // If the score column hasn't been migrated yet, fall back to created_at ordering.
  if (error?.message?.includes('score')) {
    ({ data, error } = await supabase
      .from('match_requests')
      .select(selectQuery)
      .eq('status', 'pending')
      .in('activity_id', activityIds)
      .order('created_at', { ascending: false }));
  }

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
    score: request.score ?? null,
  })) as PendingMatchRequestView[];
}

export interface OutgoingRequestView {
  id: string;
  activityId: string;
  activityTitle: string;
  categoryIcon: string;
  categoryName: string;
  neighborhood: string;
  dateLabel: string;
  hostName: string;
  hostTrustScore: number;
  status: 'pending' | 'accepted' | 'declined';
}

export async function getOutgoingRequests(userId: string): Promise<OutgoingRequestView[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('match_requests')
    .select(`
      *,
      activities!match_requests_activity_id_fkey (
        id, title, neighborhood, date_time, recurrence_rule,
        categories!activities_category_id_fkey ( name, icon ),
        profiles!activities_user_id_fkey ( name, trust_score )
      )
    `)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((request: any) => ({
    id: request.id,
    activityId: request.activity_id,
    activityTitle: request.activities?.title ?? 'Activity',
    categoryIcon: request.activities?.categories?.icon ?? '✨',
    categoryName: request.activities?.categories?.name ?? 'other',
    neighborhood: request.activities?.neighborhood ?? '',
    dateLabel: formatActivitySchedule(
      request.activities?.date_time ?? null,
      request.activities?.recurrence_rule ?? null
    ),
    hostName: request.activities?.profiles?.name ?? 'Unknown',
    hostTrustScore: request.activities?.profiles?.trust_score ?? 0,
    status: request.status as 'pending' | 'accepted' | 'declined',
  }));
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

    const { error: activityError } = await supabase
      .from('activities')
      .update({ status: 'matched' })
      .eq('id', activityId);

    if (activityError) throw activityError;

    const { error: declineOthersError } = await supabase
      .from('match_requests')
      .update({ status: 'declined' })
      .eq('activity_id', activityId)
      .eq('status', 'pending')
      .neq('id', requestId);

    if (declineOthersError) throw declineOthersError;
  }

  // Notify the requester about the outcome (fire-and-forget)
  if (requesterId && activityId) {
    const { data: activity } = await supabase
      .from('activities')
      .select('title')
      .eq('id', activityId)
      .single();

    void notifyMatchResponse(
      requesterId,
      status,
      activity?.title ?? 'the activity'
    );
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

export async function setKeepChatOpen(matchId: string, currentUserId: string) {
  const supabase = getSupabaseClient();

  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('user1_id, user2_id')
    .eq('id', matchId)
    .single();

  if (fetchError) throw fetchError;

  const column =
    match.user1_id === currentUserId
      ? 'keep_open_user1'
      : match.user2_id === currentUserId
        ? 'keep_open_user2'
        : null;

  if (!column) {
    throw new Error('You are not a participant in this match.');
  }

  const { error } = await supabase
    .from('matches')
    .update({ [column]: true })
    .eq('id', matchId);

  if (error) throw error;
}

export async function updateMatchStatus(matchId: string, status: 'completed' | 'cancelled') {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('matches')
    .update({ status })
    .eq('id', matchId);

  if (error) throw error;
}

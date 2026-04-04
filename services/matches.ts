import { supabase } from '@/lib/supabase';

export async function createMatchRequest(activityId: string, requesterId: string) {
  const { data, error } = await supabase
    .from('match_requests')
    .insert({ activity_id: activityId, requester_id: requesterId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingRequestsForUser(userId: string) {
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
    .in(
      'activity_id',
      supabase
        .from('activities')
        .select('id')
        .eq('user_id', userId) as any
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getOutgoingRequests(userId: string) {
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
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      activities!matches_activity_id_fkey (
        title, neighborhood, date_time,
        categories!activities_category_id_fkey ( name, icon )
      ),
      user1:profiles!matches_user1_id_fkey ( id, name, trust_score, profile_photo ),
      user2:profiles!matches_user2_id_fkey ( id, name, trust_score, profile_photo )
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((match: any) => {
    const companion = match.user1?.id === userId ? match.user2 : match.user1;
    return {
      ...match,
      companion_name: companion?.name ?? 'Unknown',
      companion_trust_score: companion?.trust_score ?? 0,
      companion_photo: companion?.profile_photo,
      activity_title: match.activities?.title ?? '',
      category_name: match.activities?.categories?.name ?? 'other',
      category_icon: match.activities?.categories?.icon ?? '✨',
      neighborhood: match.activities?.neighborhood ?? '',
      date_time: match.activities?.date_time,
    };
  });
}

export async function getMatchById(matchId: string, currentUserId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      activities!matches_activity_id_fkey (
        title, neighborhood, date_time,
        categories!activities_category_id_fkey ( name, icon )
      ),
      user1:profiles!matches_user1_id_fkey ( id, name, trust_score, profile_photo ),
      user2:profiles!matches_user2_id_fkey ( id, name, trust_score, profile_photo )
    `)
    .eq('id', matchId)
    .single();

  if (error) throw error;

  const companion = data.user1?.id === currentUserId ? data.user2 : data.user1;
  return {
    ...data,
    companion_name: companion?.name ?? 'Companion',
    companion_trust_score: companion?.trust_score ?? 0,
    companion_photo: companion?.profile_photo,
    activity_title: (data as any).activities?.title ?? 'Activity',
    category_name: (data as any).activities?.categories?.name ?? 'other',
    category_icon: (data as any).activities?.categories?.icon ?? '✨',
    neighborhood: (data as any).activities?.neighborhood ?? '',
    date_time: (data as any).activities?.date_time,
  };
}

export async function updateMatchStatus(matchId: string, status: 'completed' | 'cancelled') {
  const { error } = await supabase
    .from('matches')
    .update({ status })
    .eq('id', matchId);

  if (error) throw error;
}

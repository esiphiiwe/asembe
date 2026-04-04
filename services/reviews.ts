import { supabase } from '@/lib/supabase';

export async function createReview(data: {
  matchId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  flagged?: boolean;
  flagReason?: string;
}) {
  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      match_id: data.matchId,
      reviewer_id: data.reviewerId,
      reviewee_id: data.revieweeId,
      rating: data.rating,
      comment: data.comment ?? null,
      flagged: data.flagged ?? false,
      flag_reason: data.flagReason ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return review;
}

export async function getReviewsForUser(userId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles!reviews_reviewer_id_fkey ( name, profile_photo )
    `)
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    reviewer_name: row.profiles?.name ?? 'Unknown',
    reviewer_photo: row.profiles?.profile_photo,
    profiles: undefined,
  }));
}

export async function hasReviewedMatch(matchId: string, reviewerId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('match_id', matchId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function getCompletedMatchesPendingReview(userId: string) {
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      activities!matches_activity_id_fkey (
        title,
        categories!activities_category_id_fkey ( name, icon )
      ),
      user1:profiles!matches_user1_id_fkey ( id, name, profile_photo ),
      user2:profiles!matches_user2_id_fkey ( id, name, profile_photo )
    `)
    .eq('status', 'completed')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error) throw error;

  const { data: existingReviews } = await supabase
    .from('reviews')
    .select('match_id')
    .eq('reviewer_id', userId);

  const reviewedMatchIds = new Set((existingReviews ?? []).map(r => r.match_id));

  return (matches ?? [])
    .filter(m => !reviewedMatchIds.has(m.id))
    .map((match: any) => {
      const companion = match.user1?.id === userId ? match.user2 : match.user1;
      return {
        ...match,
        companion_id: companion?.id,
        companion_name: companion?.name ?? 'Unknown',
        companion_photo: companion?.profile_photo,
        activity_title: match.activities?.title ?? '',
        category_name: match.activities?.categories?.name ?? 'other',
        category_icon: match.activities?.categories?.icon ?? '✨',
      };
    });
}

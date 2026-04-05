import { getSupabaseClient } from '@/lib/supabase';

export interface UserReviewView {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerPhoto: string | null;
}

export interface PendingReviewMatchView {
  id: string;
  companionId: string;
  companionName: string;
  companionPhoto: string | null;
  activityTitle: string;
  categoryName: string;
  categoryIcon: string;
}

export async function createReview(data: {
  matchId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  flagged?: boolean;
  flagReason?: string;
}) {
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
    id: row.id,
    rating: row.rating,
    comment: row.comment ?? null,
    createdAt: row.created_at,
    reviewerName: row.profiles?.name ?? 'Unknown',
    reviewerPhoto: row.profiles?.profile_photo ?? null,
  })) as UserReviewView[];
}

export async function hasReviewedMatch(matchId: string, reviewerId: string) {
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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

  const { data: existingReviews, error: existingReviewsError } = await supabase
    .from('reviews')
    .select('match_id')
    .eq('reviewer_id', userId);

  if (existingReviewsError) throw existingReviewsError;

  const reviewedMatchIds = new Set((existingReviews ?? []).map(r => r.match_id));

  const loadedMatches = (matches ?? []) as any[];

  return loadedMatches
    .filter(m => !reviewedMatchIds.has(m.id))
    .map((match: any) => {
      const companion = match.user1?.id === userId ? match.user2 : match.user1;
      return {
        id: match.id,
        companionId: companion?.id ?? '',
        companionName: companion?.name ?? 'Unknown',
        companionPhoto: companion?.profile_photo ?? null,
        activityTitle: match.activities?.title ?? '',
        categoryName: match.activities?.categories?.name ?? 'other',
        categoryIcon: match.activities?.categories?.icon ?? '✨',
      };
    }) as PendingReviewMatchView[];
}

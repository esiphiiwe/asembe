import { formatActivitySchedule } from '@/lib/activity-utils';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ActivityRow = Database['public']['Tables']['activities']['Row'];
type ActivityInsert = Database['public']['Tables']['activities']['Insert'];
type ProfilePreview = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'name' | 'trust_score' | 'bio' | 'profile_photo' | 'verified' | 'age' | 'gender' | 'city'
>;
type CategoryPreview = Pick<Database['public']['Tables']['categories']['Row'], 'name' | 'icon'>;

export interface ActivityFeedItem {
  id: string;
  userId: string;
  title: string;
  neighborhood: string;
  city: string;
  country: string;
  dateTime: string | null;
  recurrenceRule: string | null;
  companionCount: number;
  categoryName: string;
  categoryIcon: string;
  posterName: string;
  posterTrustScore: number;
  dateLabel: string;
}

export interface ActivityPoster {
  id: string;
  name: string;
  trustScore: number;
  verified: boolean;
  bio: string | null;
  profilePhoto: string | null;
  age: number | null;
  gender: Database['public']['Tables']['profiles']['Row']['gender'] | null;
  city: string | null;
}

export interface ActivityDetailView {
  id: string;
  userId: string;
  title: string;
  description: string;
  neighborhood: string;
  city: string;
  country: string;
  dateTime: string | null;
  recurrenceRule: string | null;
  companionCount: number;
  categoryName: string;
  categoryIcon: string;
  scheduleLabel: string;
  poster: ActivityPoster;
}

export interface UserActivityView {
  id: string;
  title: string;
  neighborhood: string;
  dateTime: string | null;
  recurrenceRule: string | null;
  companionCount: number;
  categoryName: string;
  categoryIcon: string;
  dateLabel: string;
}

function mapActivityFeedItem(
  row: ActivityRow & { profiles?: Pick<ProfilePreview, 'name' | 'trust_score'> | null; categories?: CategoryPreview | null }
): ActivityFeedItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    neighborhood: row.neighborhood,
    city: row.city,
    country: row.country,
    dateTime: row.date_time,
    recurrenceRule: row.recurrence_rule,
    companionCount: row.companion_count,
    categoryName: row.categories?.name ?? 'other',
    categoryIcon: row.categories?.icon ?? '✨',
    posterName: row.profiles?.name ?? 'Unknown',
    posterTrustScore: row.profiles?.trust_score ?? 0,
    dateLabel: formatActivitySchedule(row.date_time, row.recurrence_rule),
  };
}

function mapActivityDetailView(
  row: ActivityRow & { profiles?: ProfilePreview | null; categories?: CategoryPreview | null }
): ActivityDetailView {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    neighborhood: row.neighborhood,
    city: row.city,
    country: row.country,
    dateTime: row.date_time,
    recurrenceRule: row.recurrence_rule,
    companionCount: row.companion_count,
    categoryName: row.categories?.name ?? 'other',
    categoryIcon: row.categories?.icon ?? '✨',
    scheduleLabel: formatActivitySchedule(row.date_time, row.recurrence_rule),
    poster: {
      id: row.profiles?.id ?? '',
      name: row.profiles?.name ?? 'Unknown',
      trustScore: row.profiles?.trust_score ?? 0,
      verified: row.profiles?.verified ?? false,
      bio: row.profiles?.bio ?? null,
      profilePhoto: row.profiles?.profile_photo ?? null,
      age: row.profiles?.age ?? null,
      gender: row.profiles?.gender ?? null,
      city: row.profiles?.city ?? null,
    },
  };
}

function mapUserActivityView(
  row: ActivityRow & { categories?: CategoryPreview | null }
): UserActivityView {
  return {
    id: row.id,
    title: row.title,
    neighborhood: row.neighborhood,
    dateTime: row.date_time,
    recurrenceRule: row.recurrence_rule,
    companionCount: row.companion_count,
    categoryName: row.categories?.name ?? 'other',
    categoryIcon: row.categories?.icon ?? '✨',
    dateLabel: formatActivitySchedule(row.date_time, row.recurrence_rule),
  };
}

export async function getOpenActivities(filters?: {
  category?: string;
  city?: string;
  search?: string;
}) {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('activities')
    .select(`
      *,
      profiles!activities_user_id_fkey ( name, trust_score ),
      categories!activities_category_id_fkey ( name, icon )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (filters?.city) {
    query = query.eq('city', filters.city);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,neighborhood.ilike.%${filters.search}%`
    );
  }
  if (filters?.category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('name', filters.category)
      .single();
    if (cat?.id) {
      query = query.eq('category_id', cat.id);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map(row => mapActivityFeedItem(row as ActivityRow & {
    profiles?: Pick<ProfilePreview, 'name' | 'trust_score'> | null;
    categories?: CategoryPreview | null;
  }));
}

export async function getActivityById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      profiles!activities_user_id_fkey ( id, name, trust_score, bio, profile_photo, verified, age, gender, city ),
      categories!activities_category_id_fkey ( name, icon )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('This activity is no longer available.');
  }

  return mapActivityDetailView(data as ActivityRow & {
    profiles?: ProfilePreview | null;
    categories?: CategoryPreview | null;
  });
}

export async function getUserActivities(userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      categories!activities_category_id_fkey ( name, icon )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row =>
    mapUserActivityView(row as ActivityRow & { categories?: CategoryPreview | null })
  );
}

export async function createActivity(activity: ActivityInsert) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateActivityStatus(id: string, status: ActivityRow['status']) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('activities')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

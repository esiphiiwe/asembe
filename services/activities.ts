import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ActivityRow = Database['public']['Tables']['activities']['Row'];
type ActivityInsert = Database['public']['Tables']['activities']['Insert'];

export interface ActivityWithPoster extends ActivityRow {
  poster_name: string;
  poster_trust_score: number;
  category_name: string;
  category_icon: string;
}

export async function getOpenActivities(filters?: {
  category?: string;
  city?: string;
  search?: string;
}) {
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

  return (data ?? []).map((row: any) => ({
    ...row,
    poster_name: row.profiles?.name ?? 'Unknown',
    poster_trust_score: row.profiles?.trust_score ?? 0,
    category_name: row.categories?.name ?? 'other',
    category_icon: row.categories?.icon ?? '✨',
    profiles: undefined,
    categories: undefined,
  })) as ActivityWithPoster[];
}

export async function getActivityById(id: string) {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      profiles!activities_user_id_fkey ( id, name, trust_score, bio, profile_photo, verified, age, gender, city ),
      categories!activities_category_id_fkey ( name, icon )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserActivities(userId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      categories!activities_category_id_fkey ( name, icon )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createActivity(activity: ActivityInsert) {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateActivityStatus(id: string, status: ActivityRow['status']) {
  const { error } = await supabase
    .from('activities')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

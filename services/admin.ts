import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type TrackerRow = Database['public']['Tables']['other_category_tracker']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];

// Labels with count >= this threshold are highlighted as ready to promote
export const PROMOTION_THRESHOLD = 5;

export type TrackerItem = TrackerRow;
export type CategoryItem = CategoryRow;

export async function getOtherCategoryTrackerItems(): Promise<TrackerItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('other_category_tracker')
    .select('*')
    .order('count', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAllCategories(): Promise<CategoryItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Promotes a tracker label to a standalone category.
 * Inserts a new row into categories and marks the tracker row as promoted.
 */
export async function promoteToCategory(
  trackerId: string,
  label: string,
  icon: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error: insertError } = await supabase
    .from('categories')
    .insert({ name: label.toLowerCase().trim(), icon });

  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from('other_category_tracker')
    .update({ promoted: true })
    .eq('id', trackerId);

  if (updateError) throw updateError;
}

export async function toggleCategoryActive(id: string, active: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('categories')
    .update({ active })
    .eq('id', id);

  if (error) throw error;
}

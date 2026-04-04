import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];

export interface UserPreferenceView {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  skillLevel: Database['public']['Tables']['user_activity_preferences']['Row']['skill_level'];
  preferredCompanionGender: Database['public']['Tables']['user_activity_preferences']['Row']['preferred_companion_gender'];
  preferredAgeRangeMin: number;
  preferredAgeRangeMax: number;
}

export async function getProfile(userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: ProfileUpdate) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserPreferences(userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_activity_preferences')
    .select(`
      *,
      categories!user_activity_preferences_category_id_fkey ( name, icon )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((preference: any) => ({
    id: preference.id,
    categoryId: preference.category_id,
    categoryName: preference.categories?.name ?? preference.category_id,
    categoryIcon: preference.categories?.icon ?? '✨',
    skillLevel: preference.skill_level,
    preferredCompanionGender: preference.preferred_companion_gender,
    preferredAgeRangeMin: preference.preferred_age_range_min,
    preferredAgeRangeMax: preference.preferred_age_range_max,
  })) as UserPreferenceView[];
}

export async function upsertPreference(pref: {
  userId: string;
  categoryId: string;
  skillLevel: 'beginner' | 'intermediate' | 'experienced';
  preferredCompanionGender: 'any' | 'women-only' | 'no-preference';
  preferredAgeRangeMin: number;
  preferredAgeRangeMax: number;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_activity_preferences')
    .upsert(
      {
        user_id: pref.userId,
        category_id: pref.categoryId,
        skill_level: pref.skillLevel,
        preferred_companion_gender: pref.preferredCompanionGender,
        preferred_age_range_min: pref.preferredAgeRangeMin,
        preferred_age_range_max: pref.preferredAgeRangeMax,
      },
      { onConflict: 'user_id,category_id' }
    );

  if (error) throw error;
}

export async function uploadProfilePhoto(userId: string, uri: string) {
  const supabase = getSupabaseClient();
  const ext = uri.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(path, blob, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ profile_photo: data.publicUrl })
    .eq('id', userId);

  if (updateError) throw updateError;

  return data.publicUrl;
}

export async function getCategories() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

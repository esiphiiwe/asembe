import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: ProfileUpdate) {
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
  const { data, error } = await supabase
    .from('user_activity_preferences')
    .select(`
      *,
      categories!user_activity_preferences_category_id_fkey ( name, icon )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data ?? [];
}

export async function upsertPreference(pref: {
  userId: string;
  categoryId: string;
  skillLevel: 'beginner' | 'intermediate' | 'experienced';
  preferredCompanionGender: 'any' | 'women-only' | 'no-preference';
  preferredAgeRangeMin: number;
  preferredAgeRangeMax: number;
}) {
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
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

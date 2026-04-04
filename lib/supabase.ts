import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const SUPABASE_CONFIG_MESSAGE =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.';

if (!isSupabaseConfigured) {
  console.warn(
    `${SUPABASE_CONFIG_MESSAGE} Live data is unavailable until those values are set.`,
  );
}

const SecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : SecureStoreAdapter,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  },
);

export class SupabaseConfigError extends Error {
  constructor(message = SUPABASE_CONFIG_MESSAGE) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new SupabaseConfigError();
  }
}

export function getSupabaseClient() {
  assertSupabaseConfigured();
  return supabase;
}

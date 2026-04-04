import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '@/types/database';

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const hasValidSupabaseUrl = isValidHttpUrl(rawSupabaseUrl);

export const isSupabaseConfigured = Boolean(hasValidSupabaseUrl && supabaseAnonKey);
export const SUPABASE_CONFIG_MESSAGE = hasValidSupabaseUrl
  ? 'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  : 'Supabase URL is invalid. Set EXPO_PUBLIC_SUPABASE_URL to a valid HTTP or HTTPS URL.';

if (!isSupabaseConfigured) {
  console.warn(
    `${SUPABASE_CONFIG_MESSAGE} Live data is unavailable until those values are set.`,
  );
}

const supabaseUrl = hasValidSupabaseUrl
  ? rawSupabaseUrl
  : 'https://placeholder.supabase.co';
const supabaseKey = supabaseAnonKey || 'placeholder-key';

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

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
};

let supabaseClient: SupabaseClient<Database> | null = null;

function createSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : SecureStoreAdapter,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  });
}

export class SupabaseConfigError extends Error {
  constructor(message = SUPABASE_CONFIG_MESSAGE) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

export class SupabaseSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseSetupError';
  }
}

export function isMissingSupabaseTableError(error: unknown, tableName: string) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { code, message } = error as SupabaseErrorLike;

  return code === 'PGRST205'
    && typeof message === 'string'
    && message.includes(`'public.${tableName}'`);
}

export function getSupabaseSetupError(error: unknown) {
  if (isMissingSupabaseTableError(error, 'profiles')) {
    return new SupabaseSetupError(
      "Supabase is connected, but the 'profiles' table is missing. Apply the project's Supabase migrations, then reload the app.",
    );
  }

  return null;
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new SupabaseConfigError();
  }
}

export function getSupabaseClient() {
  assertSupabaseConfigured();
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }

  return supabaseClient;
}

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
const SECURE_STORE_CHUNK_SIZE = 1800;
const SECURE_STORE_CHUNK_SUFFIX = '__chunk_count';

function getChunkCountKey(key: string) {
  return `${key}${SECURE_STORE_CHUNK_SUFFIX}`;
}

const SecureStoreAdapter = {
  async getItem(key: string) {
    const chunkCountValue = await SecureStore.getItemAsync(getChunkCountKey(key));

    if (!chunkCountValue) {
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = Number(chunkCountValue);

    if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.getItemAsync(`${key}_${index}`)
      )
    );

    if (chunks.some(chunk => chunk == null)) {
      return null;
    }

    return chunks.join('');
  },
  async setItem(key: string, value: string) {
    const existingChunkCountValue = await SecureStore.getItemAsync(getChunkCountKey(key));
    const existingChunkCount = existingChunkCountValue ? Number(existingChunkCountValue) : 0;

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);

      if (existingChunkCount > 0) {
        await Promise.all([
          SecureStore.deleteItemAsync(getChunkCountKey(key)),
          ...Array.from({ length: existingChunkCount }, (_, index) =>
            SecureStore.deleteItemAsync(`${key}_${index}`)
          ),
        ]);
      }

      return;
    }

    const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, 'g')) ?? [];

    await SecureStore.deleteItemAsync(key);
    await Promise.all([
      SecureStore.setItemAsync(getChunkCountKey(key), String(chunks.length)),
      ...chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${key}_${index}`, chunk)
      ),
      ...Array.from({ length: existingChunkCount }, (_, index) =>
        index >= chunks.length ? SecureStore.deleteItemAsync(`${key}_${index}`) : Promise.resolve()
      ),
    ]);
  },
  async removeItem(key: string) {
    const chunkCountValue = await SecureStore.getItemAsync(getChunkCountKey(key));
    const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;

    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(getChunkCountKey(key)),
      ...Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.deleteItemAsync(`${key}_${index}`)
      ),
    ]);
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

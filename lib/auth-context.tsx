import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseSetupError, isSupabaseConfigured } from './supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type CreateProfileData = Omit<ProfileInsert, 'id' | 'email' | 'verified' | 'trust_score' | 'created_at'>;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  error: Error | null;
  isLoading: boolean;
  isOnboarded: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; session: Session | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  createProfile: (
    data: CreateProfileData & { userId: string; email: string }
  ) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    error: null,
    isLoading: true,
    isOnboarded: false,
  });

  const fetchProfile = async (userId: string) => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw getSupabaseSetupError(error) ?? error;
    }

    return data;
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState(prev => ({ ...prev, error: null, isLoading: false }));
      return;
    }

    const client = getSupabaseClient();
    let isMounted = true;

    const syncAuthState = async (session: Session | null) => {
      try {
        let profile: Profile | null = null;
        if (session?.user) {
          profile = await fetchProfile(session.user.id);
        }

        if (!isMounted) {
          return;
        }

        setState({
          session,
          user: session?.user ?? null,
          profile,
          error: null,
          isLoading: false,
          isOnboarded: !!profile,
        });
      }
      catch (error) {
        const normalizedError = error instanceof Error
          ? error
          : new Error('Failed to synchronize auth state.');

        console.warn('Failed to synchronize auth state', normalizedError);

        if (!isMounted) {
          return;
        }

        setState({
          session,
          user: session?.user ?? null,
          profile: null,
          error: normalizedError,
          isLoading: false,
          isOnboarded: !!session?.user,
        });
      }
    };

    void client.auth.getSession().then(({ data: { session } }) => syncAuthState(session));

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, session) => {
        void syncAuthState(session);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({ email, password });
      return {
        user: data.user ?? null,
        session: data.session ?? null,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Could not create account.'),
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Could not sign in.') };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email);
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Could not send reset email.') };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      await client.auth.signOut();
    }

    setState({
      session: null,
      user: null,
      profile: null,
      error: null,
      isLoading: false,
      isOnboarded: false,
    });
  };

  const createProfile = async (
    data: CreateProfileData & { userId: string; email: string }
  ) => {
    try {
      const client = getSupabaseClient();
      const { userId, email, ...profileData } = data;
      const { error } = await client.from('profiles').insert({
        id: userId,
        email,
        ...profileData,
      });

      if (!error) {
        const profile = await fetchProfile(userId);
        setState(prev => ({
          ...prev,
          profile,
          error: null,
          isOnboarded: !!profile,
        }));
      }

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Could not create profile.') };
    }
  };

  const refreshProfile = async () => {
    if (!state.user || !isSupabaseConfigured) return;

    try {
      const profile = await fetchProfile(state.user.id);
      setState(prev => ({ ...prev, profile, error: null, isOnboarded: !!profile }));
    } catch (error) {
      console.warn('Failed to refresh profile', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to refresh profile.'),
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signUp, signIn, signOut, resetPassword, createProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

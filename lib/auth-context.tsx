import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isMockMode } from './supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createProfile: (data: Omit<Profile, 'id' | 'email' | 'verified' | 'trust_score' | 'created_at'>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isOnboarded: false,
  });

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  };

  useEffect(() => {
    if (isMockMode) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let profile: Profile | null = null;
      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }
      setState({
        session,
        user: session?.user ?? null,
        profile,
        isLoading: false,
        isOnboarded: !!profile,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        let profile: Profile | null = null;
        if (session?.user) {
          profile = await fetchProfile(session.user.id);
        }
        setState({
          session,
          user: session?.user ?? null,
          profile,
          isLoading: false,
          isOnboarded: !!profile,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      isOnboarded: false,
    });
  };

  const createProfile = async (
    data: Omit<Profile, 'id' | 'email' | 'verified' | 'trust_score' | 'created_at'>
  ) => {
    if (!state.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase.from('profiles').insert({
      id: state.user.id,
      email: state.user.email!,
      ...data,
    });

    if (!error) {
      const profile = await fetchProfile(state.user.id);
      setState(prev => ({ ...prev, profile, isOnboarded: true }));
    }

    return { error: error ? new Error(error.message) : null };
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState(prev => ({ ...prev, profile, isOnboarded: !!profile }));
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signUp, signIn, signOut, createProfile, refreshProfile }}
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

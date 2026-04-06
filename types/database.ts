export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          gender: 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';
          age: number;
          profile_photo: string | null;
          bio: string | null;
          city: string;
          country: string;
          verified: boolean;
          trust_score: number;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          phone?: string | null;
          gender: 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';
          age: number;
          profile_photo?: string | null;
          bio?: string | null;
          city: string;
          country: string;
          verified?: boolean;
          trust_score?: number;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          icon: string;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          custom_category_label: string | null;
          title: string;
          description: string;
          date_time: string | null;
          recurrence_rule: string | null;
          recurrence_end_date: string | null;
          neighborhood: string;
          coordinates: { lat: number; lng: number } | null;
          city: string;
          country: string;
          companion_count: number;
          women_only: boolean;
          status: 'open' | 'matched' | 'closed' | 'expired';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          custom_category_label?: string | null;
          title: string;
          description: string;
          date_time?: string | null;
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          neighborhood: string;
          coordinates?: { lat: number; lng: number } | null;
          city: string;
          country: string;
          companion_count: number;
          women_only?: boolean;
          status?: 'open' | 'matched' | 'closed' | 'expired';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
        Relationships: [];
      };
      user_activity_preferences: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          skill_level: 'beginner' | 'intermediate' | 'experienced';
          preferred_companion_gender: 'any' | 'women-only' | 'no-preference';
          preferred_age_range_min: number;
          preferred_age_range_max: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          skill_level: 'beginner' | 'intermediate' | 'experienced';
          preferred_companion_gender: 'any' | 'women-only' | 'no-preference';
          preferred_age_range_min: number;
          preferred_age_range_max: number;
        };
        Update: Partial<Database['public']['Tables']['user_activity_preferences']['Insert']>;
        Relationships: [];
      };
      match_requests: {
        Row: {
          id: string;
          activity_id: string;
          requester_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          requester_id: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_requests']['Insert']>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          activity_id: string;
          user1_id: string;
          user2_id: string;
          status: 'confirmed' | 'completed' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          user1_id: string;
          user2_id: string;
          status?: 'confirmed' | 'completed' | 'cancelled';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          match_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          flagged: boolean;
          flag_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
          flagged?: boolean;
          flag_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
        Relationships: [];
      };
      other_category_tracker: {
        Row: {
          id: string;
          label: string;
          count: number;
          promoted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          count?: number;
          promoted?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['other_category_tracker']['Insert']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          text: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
        Relationships: [];
      };
      user_blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_blocks']['Insert']>;
        Relationships: [];
      };
      user_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          context_type: 'match' | 'activity' | null;
          context_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          context_type?: 'match' | 'activity' | null;
          context_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_reports']['Insert']>;
        Relationships: [];
      };
      user_trusted_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_trusted_contacts']['Insert']>;
        Relationships: [];
      };
    };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: 'free' | 'standard' | 'premium' | 'founding';
          status: 'active' | 'cancelled' | 'past_due';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          period_start: string | null;
          period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier?: 'free' | 'standard' | 'premium' | 'founding';
          status?: 'active' | 'cancelled' | 'past_due';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      gender_type: 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';
      skill_level: 'beginner' | 'intermediate' | 'experienced';
      companion_gender_pref: 'any' | 'women-only' | 'no-preference';
      activity_status: 'open' | 'matched' | 'closed' | 'expired';
      match_request_status: 'pending' | 'accepted' | 'declined';
      match_status: 'confirmed' | 'completed' | 'cancelled';
      subscription_tier: 'free' | 'standard' | 'premium' | 'founding';
      subscription_status: 'active' | 'cancelled' | 'past_due';
    };
  };
};

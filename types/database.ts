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
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
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
          coordinates: { lat: number; lng: number };
          city: string;
          country: string;
          companion_count: number;
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
          coordinates: { lat: number; lng: number };
          city: string;
          country: string;
          companion_count: number;
          status?: 'open' | 'matched' | 'closed' | 'expired';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
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
      };
    };
    Functions: Record<string, never>;
    Enums: {
      gender_type: 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';
      skill_level: 'beginner' | 'intermediate' | 'experienced';
      companion_gender_pref: 'any' | 'women-only' | 'no-preference';
      activity_status: 'open' | 'matched' | 'closed' | 'expired';
      match_request_status: 'pending' | 'accepted' | 'declined';
      match_status: 'confirmed' | 'completed' | 'cancelled';
    };
  };
};

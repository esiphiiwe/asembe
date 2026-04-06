export type Gender = 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';

export type SubscriptionTier = 'free' | 'standard' | 'premium' | 'founding';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';

export type CategoryName =
  | 'hiking'
  | 'museums'
  | 'concerts'
  | 'dining'
  | 'running'
  | 'art'
  | 'film'
  | 'travel'
  | 'other';

export type SkillLevel = 'beginner' | 'intermediate' | 'experienced';

export type CompanionGenderPref = 'any' | 'women-only' | 'no-preference';

export type ActivityStatus = 'open' | 'matched' | 'closed' | 'expired';

export type MatchRequestStatus = 'pending' | 'accepted' | 'declined';

export type MatchStatus = 'confirmed' | 'completed' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  age: number;
  profilePhoto: string;
  bio: string;
  city: string;
  country: string;
  verified: boolean;
  trustScore: number;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: CategoryName;
  icon: string;
  active: boolean;
}

export interface Activity {
  id: string;
  userId: string;
  categoryId: string;
  customCategoryLabel?: string;
  title: string;
  description: string;
  dateTime?: Date;
  recurrenceRule?: string;
  recurrenceEndDate?: Date;
  neighborhood: string;
  coordinates: { lat: number; lng: number };
  city: string;
  country: string;
  companionCount: 1 | 2 | 3 | 4;
  status: ActivityStatus;
  createdAt: Date;
}

export interface UserActivityPreference {
  userId: string;
  categoryId: string;
  skillLevel: SkillLevel;
  preferredCompanionGender: CompanionGenderPref;
  preferredAgeRangeMin: number;
  preferredAgeRangeMax: number;
}

export interface MatchRequest {
  id: string;
  activityId: string;
  requesterId: string;
  status: MatchRequestStatus;
  createdAt: Date;
}

export interface Match {
  id: string;
  activityId: string;
  user1Id: string;
  user2Id: string;
  status: MatchStatus;
  createdAt: Date;
}

export interface Review {
  id: string;
  matchId: string;
  reviewerId: string;
  revieweeId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  flagged: boolean;
  flagReason?: string;
  createdAt: Date;
}

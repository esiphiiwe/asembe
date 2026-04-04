import type { CategoryName } from '@/types';

export const CATEGORIES: { name: CategoryName; icon: string }[] = [
  { name: 'hiking', icon: '🥾' },
  { name: 'museums', icon: '🏛️' },
  { name: 'concerts', icon: '🎵' },
  { name: 'dining', icon: '🍽️' },
  { name: 'running', icon: '🏃' },
  { name: 'art', icon: '🎨' },
  { name: 'film', icon: '🎬' },
  { name: 'travel', icon: '✈️' },
  { name: 'other', icon: '✨' },
];

export const BIO_MAX_LENGTH = 160;

export const MATCH_REQUESTS_FREE_LIMIT = 3;

export const CHAT_EXPIRY_HOURS = 48;

export const SUBSCRIPTION_TIERS = {
  free: {
    price: 0,
    matchRequestsPerMonth: 3,
    advancedFilters: false,
    prioritySurfacing: false,
    recurringActivities: false,
  },
  standard: {
    price: 9.99,
    matchRequestsPerMonth: Infinity,
    advancedFilters: true,
    prioritySurfacing: false,
    recurringActivities: true,
  },
  premium: {
    price: 19.99,
    matchRequestsPerMonth: Infinity,
    advancedFilters: true,
    prioritySurfacing: true,
    recurringActivities: true,
  },
} as const;

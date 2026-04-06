import { getSupabaseClient } from '@/lib/supabase';
import type { SubscriptionTier } from '@/types/index';

export const FREE_MATCH_REQUEST_LIMIT = 3;

export interface SubscriptionRecord {
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'past_due';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === 'standard' || tier === 'premium' || tier === 'founding';
}

export async function getUserSubscription(userId: string): Promise<SubscriptionRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      tier: 'free',
      status: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      periodStart: null,
      periodEnd: null,
    };
  }

  return {
    tier: data.tier,
    status: data.status,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    periodStart: data.period_start,
    periodEnd: data.period_end,
  };
}

export async function getMonthlyMatchRequestCount(userId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { count, error } = await supabase
    .from('match_requests')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', userId)
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd);

  if (error) throw error;

  return count ?? 0;
}

export async function canSendMatchRequest(userId: string): Promise<{
  allowed: boolean;
  count: number;
  limit: number | null;
  reason?: string;
}> {
  const subscription = await getUserSubscription(userId);

  if (isPaidTier(subscription.tier) && subscription.status === 'active') {
    return { allowed: true, count: 0, limit: null };
  }

  const count = await getMonthlyMatchRequestCount(userId);
  const allowed = count < FREE_MATCH_REQUEST_LIMIT;

  return {
    allowed,
    count,
    limit: FREE_MATCH_REQUEST_LIMIT,
    reason: allowed
      ? undefined
      : `You've reached your ${FREE_MATCH_REQUEST_LIMIT} match requests for this month. Upgrade to Standard or Premium for unlimited requests.`,
  };
}

export async function canPostRecurring(userId: string): Promise<{ allowed: boolean }> {
  const subscription = await getUserSubscription(userId);
  return { allowed: isPaidTier(subscription.tier) && subscription.status === 'active' };
}

export async function canUseAdvancedFilters(userId: string): Promise<{ allowed: boolean }> {
  const subscription = await getUserSubscription(userId);
  return { allowed: isPaidTier(subscription.tier) && subscription.status === 'active' };
}

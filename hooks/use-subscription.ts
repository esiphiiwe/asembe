import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUserSubscription,
  canSendMatchRequest,
  canPostRecurring,
  canUseAdvancedFilters,
  type SubscriptionRecord,
} from '@/services/subscriptions';
import type { SubscriptionTier } from '@/types/index';

interface SubscriptionState {
  subscription: SubscriptionRecord | null;
  tier: SubscriptionTier;
  isLoading: boolean;
  error: Error | null;
  canRecurring: boolean;
  canAdvancedFilters: boolean;
  matchRequestCount: number;
  matchRequestLimit: number | null;
  canRequest: boolean;
}

const DEFAULT_STATE: SubscriptionState = {
  subscription: null,
  tier: 'free',
  isLoading: true,
  error: null,
  canRecurring: false,
  canAdvancedFilters: false,
  matchRequestCount: 0,
  matchRequestLimit: 3,
  canRequest: true,
};

export function useSubscription(): SubscriptionState & { refresh: () => Promise<void> } {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);

  const load = useCallback(async () => {
    if (!user) {
      setState({ ...DEFAULT_STATE, isLoading: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [subscription, recurringResult, filtersResult, requestResult] = await Promise.all([
        getUserSubscription(user.id),
        canPostRecurring(user.id),
        canUseAdvancedFilters(user.id),
        canSendMatchRequest(user.id),
      ]);

      setState({
        subscription,
        tier: subscription.tier,
        isLoading: false,
        error: null,
        canRecurring: recurringResult.allowed,
        canAdvancedFilters: filtersResult.allowed,
        matchRequestCount: requestResult.count,
        matchRequestLimit: requestResult.limit,
        canRequest: requestResult.allowed,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Could not load subscription.'),
      }));
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, refresh: load };
}

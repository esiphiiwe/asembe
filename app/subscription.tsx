import { useState } from 'react';
import { Text, View, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/hooks/use-subscription';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import type { SubscriptionTier } from '@/types/index';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const isStripeConfigured = Boolean(STRIPE_PUBLISHABLE_KEY && SUPABASE_URL);

interface PlanConfig {
  tier: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  priceId: string;
  perks: string[];
  highlight?: string;
}

const PLANS: PlanConfig[] = [
  {
    tier: 'free',
    name: 'Free',
    price: '€0',
    period: 'forever',
    priceId: '',
    perks: [
      '3 match requests per month',
      'Post activities',
      'Browse the full feed',
      'Women-only filter',
      'Basic safety features',
    ],
  },
  {
    tier: 'standard',
    name: 'Standard',
    price: '€9.99',
    period: 'per month',
    priceId: 'price_standard_monthly',
    perks: [
      'Unlimited match requests',
      'Post recurring activities',
      'Advanced filters (age & skill)',
      'Everything in Free',
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: '€19.99',
    period: 'per month',
    priceId: 'price_premium_monthly',
    perks: [
      'Priority match surfacing',
      'Unlimited match requests',
      'Post recurring activities',
      'Advanced filters (age & skill)',
      'Everything in Standard',
    ],
    highlight: 'Most popular',
  },
  {
    tier: 'founding',
    name: 'Founding Member',
    price: '€49',
    period: 'per year (~€4/mo)',
    priceId: 'price_founding_yearly',
    perks: [
      'All Standard features',
      'Founding member badge on profile',
      'Input into category roadmap',
      'Lock in the lowest price forever',
    ],
    highlight: 'Limited offer',
  },
];

function tierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free': return 'Free';
    case 'standard': return 'Standard';
    case 'premium': return 'Premium';
    case 'founding': return 'Founding Member';
  }
}

export default function SubscriptionScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { tier, isLoading, refresh } = useSubscription();
  const handleBack = useBackNavigation({ fallbackHref: '/settings', returnTo });

  const [upgradingTo, setUpgradingTo] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = async (plan: PlanConfig) => {
    if (plan.tier === 'free') return;
    if (plan.tier === tier) return;
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to upgrade.');
      return;
    }

    if (!isStripeConfigured) {
      Alert.alert(
        'Payment coming soon',
        'Stripe has not been configured yet. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and deploy the Edge Functions to enable payments.'
      );
      return;
    }

    setUpgradingTo(plan.tier);
    try {
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: user.id,
          returnUrl: 'asambe://subscription',
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'Could not start checkout.');
      }

      const { url } = (await response.json()) as { url: string };

      const result = await WebBrowser.openBrowserAsync(url);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        await refresh();
      }
    } catch (err) {
      Alert.alert(
        'Payment error',
        err instanceof Error ? err.message : 'Could not start the checkout session.'
      );
    } finally {
      setUpgradingTo(null);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-2 pb-2">
          <Pressable onPress={handleBack} className="w-10 h-10 items-center justify-center -ml-2">
            <IconSymbol name="arrow.left" size={20} color="#44403c" />
          </Pressable>

          <Text className="mt-4 font-serif text-3xl font-bold text-neutral-900">
            Choose your plan
          </Text>
          <Text className="text-sm text-neutral-500 mt-1">
            Currently on{' '}
            <Text className="font-semibold text-neutral-700">{tierLabel(tier)}</Text>
          </Text>
        </View>

        <View className="px-6 pb-10 gap-4 mt-2">
          {PLANS.map(plan => {
            const isCurrent = plan.tier === tier;
            const isPremiumHighlight = plan.tier === 'premium';
            const isUpgrading = upgradingTo === plan.tier;
            const canUpgrade = !isCurrent && plan.tier !== 'free';

            return (
              <View
                key={plan.tier}
                className={`rounded-2xl border overflow-hidden ${
                  isPremiumHighlight
                    ? 'border-primary-400 bg-white'
                    : isCurrent
                    ? 'border-neutral-300 bg-white'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                {plan.highlight ? (
                  <View className="bg-primary-500 px-4 py-1.5">
                    <Text className="text-xs font-semibold text-white text-center tracking-wide uppercase">
                      {plan.highlight}
                    </Text>
                  </View>
                ) : null}

                <View className="p-5">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="font-serif text-xl font-bold text-neutral-900">
                      {plan.name}
                    </Text>
                    {isCurrent ? (
                      <View className="flex-row items-center bg-green-100 px-2.5 py-1 rounded-full">
                        <IconSymbol name="checkmark" size={12} color="#16a34a" />
                        <Text className="text-xs font-semibold text-green-700 ml-1">Current</Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="flex-row items-baseline mb-4">
                    <Text className="text-2xl font-bold text-neutral-900">{plan.price}</Text>
                    <Text className="text-sm text-neutral-400 ml-1">{plan.period}</Text>
                  </View>

                  <View className="gap-2 mb-5">
                    {plan.perks.map(perk => (
                      <View key={perk} className="flex-row items-start">
                        <IconSymbol name="checkmark.circle.fill" size={16} color="#e8572a" />
                        <Text className="text-sm text-neutral-600 ml-2 flex-1">{perk}</Text>
                      </View>
                    ))}
                  </View>

                  {canUpgrade ? (
                    <Pressable
                      onPress={() => void handleUpgrade(plan)}
                      disabled={isUpgrading}
                      className={`py-3.5 rounded-2xl items-center ${
                        isPremiumHighlight ? 'bg-primary-500' : 'bg-neutral-900'
                      } ${isUpgrading ? 'opacity-60' : ''}`}
                    >
                      {isUpgrading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-sm font-semibold text-white">
                          Upgrade to {plan.name}
                        </Text>
                      )}
                    </Pressable>
                  ) : isCurrent ? (
                    <View className="py-3.5 rounded-2xl items-center bg-neutral-100">
                      <Text className="text-sm font-semibold text-neutral-400">
                        Your current plan
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}

          {!isStripeConfigured ? (
            <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Text className="text-xs text-amber-700 text-center">
                Payments are not yet configured. Set{' '}
                <Text className="font-mono">EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY</Text> to enable upgrades.
              </Text>
            </View>
          ) : null}

          <View className="h-4" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

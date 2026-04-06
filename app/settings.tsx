import { useEffect, useState } from 'react';
import { Text, View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { SettingsRow } from '@/components/ui/settings-row';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/hooks/use-subscription';

const PUSH_NOTIFICATIONS_KEY = 'settings.pushNotifications';
const EMAIL_NOTIFICATIONS_KEY = 'settings.emailNotifications';

function tierLabel(tier: string): string {
  switch (tier) {
    case 'standard': return 'Standard';
    case 'premium': return 'Premium';
    case 'founding': return 'Founding Member';
    default: return 'Free';
  }
}

export default function SettingsScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { tier } = useSubscription();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [hasLoadedNotificationPreferences, setHasLoadedNotificationPreferences] = useState(false);
  const handleBack = useBackNavigation({
    fallbackHref: '/(tabs)/profile',
    returnTo,
  });

  useEffect(() => {
    void Promise.all([
      SecureStore.getItemAsync(PUSH_NOTIFICATIONS_KEY),
      SecureStore.getItemAsync(EMAIL_NOTIFICATIONS_KEY),
    ]).then(([storedPushNotifications, storedEmailNotifications]) => {
      if (storedPushNotifications !== null) {
        setPushNotifications(storedPushNotifications === 'true');
      }

      if (storedEmailNotifications !== null) {
        setEmailNotifications(storedEmailNotifications === 'true');
      }
    }).finally(() => {
      setHasLoadedNotificationPreferences(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedNotificationPreferences) {
      return;
    }

    void SecureStore.setItemAsync(PUSH_NOTIFICATIONS_KEY, String(pushNotifications));
  }, [hasLoadedNotificationPreferences, pushNotifications]);

  useEffect(() => {
    if (!hasLoadedNotificationPreferences) {
      return;
    }

    void SecureStore.setItemAsync(EMAIL_NOTIFICATIONS_KEY, String(emailNotifications));
  }, [emailNotifications, hasLoadedNotificationPreferences]);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/landing');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 pt-2 pb-2">
          <NavIconButton
            icon="arrow.left"
            onPress={handleBack}
            variant="bordered"
          />
          <Text className="mt-4 font-serif text-3xl font-bold text-neutral-900">
            Settings
          </Text>
        </View>

        {/* Account */}
        <View className="mt-4">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Account
          </Text>
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <SettingsRow
              icon="envelope.fill"
              label="Email"
              value={profile?.email ?? '—'}
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="phone.fill"
              label="Phone"
              value={profile?.phone ?? 'Not set'}
            />
          </View>
        </View>

        {/* Notifications */}
        <View className="mt-6">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Notifications
          </Text>
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <SettingsRow
              icon="bell.fill"
              label="Push notifications"
              type="toggle"
              toggled={pushNotifications}
              onToggle={setPushNotifications}
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="envelope.fill"
              label="Email notifications"
              type="toggle"
              toggled={emailNotifications}
              onToggle={setEmailNotifications}
            />
          </View>
        </View>

        {/* Safety */}
        <View className="mt-6">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Safety
          </Text>
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <SettingsRow
              icon="checkmark.circle.fill"
              label="Photo verification"
              value={profile?.verified ? 'Verified' : 'Not verified'}
              iconColor={profile?.verified ? '#16a34a' : '#a8a29e'}
              type={profile?.verified ? undefined : 'nav'}
              onPress={profile?.verified ? undefined : () => {
                Alert.alert(
                  'Get verified',
                  'Photo verification confirms your identity by matching a selfie to your profile photo. Tap "Start" when you\'re ready — verification usually takes under 2 minutes.',
                  [
                    { text: 'Not now', style: 'cancel' },
                    {
                      text: 'Start verification',
                      onPress: () => Alert.alert(
                        'Verification coming soon',
                        'Photo verification will be available in the next update. Make sure your profile photo is a clear, recent photo of your face.'
                      ),
                    },
                  ]
                );
              }}
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="person.2.fill"
              label="Trusted contacts"
              onPress={() =>
                router.push({
                  pathname: '/trusted-contacts',
                  params: { returnTo: '/settings' },
                })
              }
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="nosign"
              label="Blocked users"
              onPress={() =>
                router.push({
                  pathname: '/blocked-users',
                  params: { returnTo: '/settings' },
                })
              }
            />
          </View>
        </View>

        {/* Subscription */}
        <View className="mt-6">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Subscription
          </Text>
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <SettingsRow
              icon="crown.fill"
              label="Plan"
              value={tierLabel(tier)}
              type="nav"
              onPress={() =>
                router.push({
                  pathname: '/subscription',
                  params: { returnTo: '/settings' },
                })
              }
            />
          </View>
        </View>

        {/* Admin */}
        {profile?.is_admin && (
          <View className="mt-6">
            <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Admin
            </Text>
            <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <SettingsRow
                icon="tag.fill"
                label="Category management"
                type="nav"
                onPress={() => router.push('/admin')}
              />
            </View>
          </View>
        )}

        {/* Danger zone */}
        <View className="mt-6 mb-10">
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <SettingsRow
              label="Log out"
              textColor="text-red-600"
              onPress={handleLogout}
            />
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

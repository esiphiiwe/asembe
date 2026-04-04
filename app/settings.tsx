import { useState } from 'react';
import { Text, View, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SettingsRow } from '@/components/ui/settings-row';
import { useAuth } from '@/lib/auth-context';
import { SUBSCRIPTION_TIERS } from '@/lib/constants';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

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
        <View className="px-6 pt-4 pb-2">
          <Text className="font-serif text-3xl font-bold text-neutral-900">
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
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="lock.fill"
              label="Password"
              value="Change"
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
              icon="hand.raised.fill"
              label="Emergency contacts"
              value="3 contacts"
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="shield.checkmark"
              label="Photo verification"
              value={profile?.verified ? 'Verified' : 'Not verified'}
              iconColor={profile?.verified ? '#16a34a' : undefined}
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="flag.fill"
              label="Blocked users"
              value="0"
            />
          </View>
        </View>

        {/* Subscription */}
        <View className="mt-6">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            Subscription
          </Text>
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-base font-semibold text-neutral-900">Free Plan</Text>
                <Text className="text-sm text-neutral-500 mt-0.5">
                  {SUBSCRIPTION_TIERS.free.matchRequestsPerMonth} match requests/month
                </Text>
              </View>
              <View className="bg-neutral-100 rounded-full px-3 py-1">
                <Text className="text-xs font-medium text-neutral-600">Current</Text>
              </View>
            </View>
            <Pressable className="bg-accent rounded-xl py-3 items-center">
              <Text className="text-white font-semibold text-sm">Upgrade to Standard — €9.99/mo</Text>
            </Pressable>
            <Text className="text-xs text-neutral-400 mt-2 text-center">
              Or become a Founding Member at €49/year
            </Text>
          </View>
        </View>

        {/* About */}
        <View className="mt-6">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            About
          </Text>
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <SettingsRow label="Terms of Service" />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow label="Privacy Policy" />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow label="Help & Support" />
          </View>
        </View>

        {/* Danger zone */}
        <View className="mt-6 mb-10">
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <SettingsRow
              label="Log out"
              textColor="text-red-600"
              onPress={handleLogout}
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <SettingsRow
              icon="trash.fill"
              label="Delete account"
              textColor="text-red-600"
              iconColor="#dc2626"
            />
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

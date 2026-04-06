import { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useAuth } from '@/lib/auth-context';
import { getBlockedUsers, unblockUser, type BlockedUserView } from '@/services/safety';

export default function BlockedUsersScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { user } = useAuth();
  const handleBack = useBackNavigation({ fallbackHref: '/settings', returnTo });

  const [blockedUsers, setBlockedUsers] = useState<BlockedUserView[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getBlockedUsers(user.id);
      setBlockedUsers(data);
    } catch {
      Alert.alert('Error', 'Could not load blocked users.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = (blocked: BlockedUserView) => {
    if (!user) return;

    Alert.alert(
      `Unblock ${blocked.blockedName}?`,
      'They will be able to see your activities and send you match requests again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await unblockUser(user.id, blocked.blockedId);
              setBlockedUsers(prev => prev.filter(b => b.id !== blocked.id));
            } catch {
              Alert.alert('Error', 'Could not unblock this user. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 pt-2 pb-2">
        <NavIconButton icon="arrow.left" onPress={handleBack} variant="bordered" />
        <Text className="mt-4 font-serif text-3xl font-bold text-neutral-900">
          Blocked users
        </Text>
        <Text className="text-sm text-neutral-500 mt-1">
          Blocked users cannot see your activities or send you match requests.
        </Text>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {blockedUsers.length === 0 ? (
          <View className="items-center py-12">
            <View className="w-16 h-16 bg-neutral-100 rounded-full items-center justify-center mb-4">
              <IconSymbol name="nosign" size={28} color="#a8a29e" />
            </View>
            <Text className="text-base font-semibold text-neutral-700 mb-1">No blocked users</Text>
            <Text className="text-sm text-neutral-400 text-center leading-5">
              Users you block from the chat screen or activity listings will appear here.
            </Text>
          </View>
        ) : (
          <>
            {blockedUsers.map(blocked => (
              <View
                key={blocked.id}
                className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3 flex-row items-center"
              >
                {blocked.blockedPhoto ? (
                  <Image
                    source={blocked.blockedPhoto}
                    contentFit="cover"
                    style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                  />
                ) : (
                  <View className="w-11 h-11 bg-neutral-200 rounded-full items-center justify-center mr-3">
                    <Text className="text-base font-bold text-neutral-500">
                      {blocked.blockedName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text className="flex-1 text-base font-semibold text-neutral-900">
                  {blocked.blockedName}
                </Text>
                <Pressable
                  onPress={() => handleUnblock(blocked)}
                  className="bg-neutral-100 rounded-xl px-3 py-2"
                  accessibilityLabel={`Unblock ${blocked.blockedName}`}
                >
                  <Text className="text-sm font-semibold text-neutral-700">Unblock</Text>
                </Pressable>
              </View>
            ))}
            <View className="h-8" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

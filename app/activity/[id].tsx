import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, View, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AsambeButton } from '@/components/ui/asambe-button';
import { ScreenState } from '@/components/ui/screen-state';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage, isConfigError, isDuplicateError } from '@/lib/errors';
import { getActivityById, type ActivityDetailView } from '@/services/activities';
import { createMatchRequest } from '@/services/matches';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [activity, setActivity] = useState<ActivityDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadActivity = useCallback(async () => {
    setError(null);

    try {
      const data = await getActivityById(id!);
      setActivity(data);
    } catch (error) {
      setActivity(null);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const handleRequestToJoin = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to request to join.');
      return;
    }
    if (!activity) {
      Alert.alert('Unavailable', 'This activity is not available right now.');
      return;
    }

    setRequesting(true);
    try {
      await createMatchRequest(id!, user.id);
      Alert.alert('Request sent!', 'The activity poster will review your request.');
    } catch (error) {
      if (isDuplicateError(error)) {
        Alert.alert('Already requested', 'You have already requested to join this activity.');
      } else {
        Alert.alert('Error', getErrorMessage(error, 'Could not send request.'));
      }
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View className="flex-1 bg-neutral-50">
        <ScreenState
          icon={isConfigError(error) ? '🛠️' : '🗓️'}
          title={isConfigError(error) ? 'Finish Supabase setup' : 'Activity unavailable'}
          description={getErrorMessage(
            error,
            'We could not load this activity from live data right now.'
          )}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            void loadActivity();
          }}
          fullScreen
        />
      </View>
    );
  }

  const isOwnActivity = user?.id === activity.userId;
  const poster = activity.poster;
  const posterInitial = (poster.name || 'A').charAt(0);

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="relative">
          <View className="w-full h-72 bg-neutral-200 items-center justify-center">
            <Text className="text-7xl">{activity.categoryIcon}</Text>
            <Text className="text-sm text-neutral-400 mt-2">Activity photo</Text>
          </View>

          <View className="absolute top-12 left-0 right-0 flex-row justify-between px-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
            >
              <IconSymbol name="arrow.left" size={20} color="#1c1917" />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm">
                <IconSymbol name="square.and.arrow.up" size={18} color="#1c1917" />
              </Pressable>
              <Pressable className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm">
                <IconSymbol name="heart" size={18} color="#1c1917" />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-6 pt-5 pb-32">
          <View className="flex-row items-center mb-3">
            <View className="bg-primary-50 rounded-full px-3 py-1 flex-row items-center">
              <Text className="text-sm mr-1">{activity.categoryIcon}</Text>
              <Text className="text-sm font-medium text-primary-700 capitalize">{activity.categoryName}</Text>
            </View>
            {activity.recurrenceRule ? (
              <View className="bg-neutral-100 rounded-full px-3 py-1 ml-2 flex-row items-center">
                <IconSymbol name="clock" size={12} color="#78716c" />
                <Text className="text-xs text-neutral-600 ml-1">Recurring</Text>
              </View>
            ) : null}
          </View>

          <Text className="font-serif text-2xl font-bold text-neutral-900 mb-3">
            {activity.title}
          </Text>

          <View className="flex-row items-center mb-4">
            <View className="flex-row items-center mr-4">
              <IconSymbol name="mappin" size={14} color="#78716c" />
              <Text className="text-sm text-neutral-600 ml-1">{activity.neighborhood}</Text>
            </View>
            <View className="flex-row items-center">
              <IconSymbol name="calendar" size={14} color="#78716c" />
              <Text className="text-sm text-neutral-600 ml-1">{activity.scheduleLabel}</Text>
            </View>
          </View>

          <View className="h-px bg-neutral-100 mb-5" />

          <View className="flex-row items-center mb-5">
            <View className="w-14 h-14 bg-primary-200 rounded-full items-center justify-center">
              <Text className="text-lg font-bold text-primary-800">
                {posterInitial}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-neutral-900">
                Posted by {poster.name.split(' ')[0]}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <IconSymbol name="star.fill" size={13} color="#d17a47" />
                <Text className="text-sm text-neutral-600 ml-1">
                  {Number(poster.trustScore).toFixed(1)} trust score
                </Text>
                {poster.verified ? (
                  <View className="flex-row items-center ml-2">
                    <IconSymbol name="checkmark.circle.fill" size={13} color="#16a34a" />
                    <Text className="text-xs text-green-700 ml-0.5">Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <Text className="text-base text-neutral-700 leading-6 mb-5">
            {activity.description}
          </Text>

          <View className="h-px bg-neutral-100 mb-5" />

          <View className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-primary-50 rounded-xl items-center justify-center">
                <IconSymbol name="person.2.fill" size={20} color="#c3653c" />
              </View>
              <View className="ml-3">
                <Text className="text-base font-semibold text-neutral-900">
                  {activity.companionCount === 1
                    ? 'Looking for 1 companion'
                    : `Looking for ${activity.companionCount} companions`}
                </Text>
                <Text className="text-sm text-neutral-500">
                  {activity.companionCount === 1 ? '1-on-1 activity' : `Small group (up to ${activity.companionCount})`}
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl border border-neutral-100 p-4">
            <Text className="text-sm font-semibold text-neutral-900 mb-3">Safety</Text>
            <View className="flex-row items-center mb-2.5">
              <IconSymbol name="checkmark.circle.fill" size={16} color="#16a34a" />
              <Text className="text-sm text-neutral-600 ml-2">
                {poster.verified ? 'Verified profile' : 'Profile verification pending'}
              </Text>
            </View>
            <View className="flex-row items-center mb-2.5">
              <IconSymbol name="envelope.fill" size={16} color="#78716c" />
              <Text className="text-sm text-neutral-600 ml-2">Email verified</Text>
            </View>
            <View className="flex-row items-center">
              <IconSymbol name="hand.raised.fill" size={16} color="#78716c" />
              <Text className="text-sm text-neutral-600 ml-2">In-app SOS available during activity</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {!isOwnActivity ? (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-6 py-4 pb-8 flex-row items-center">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-primary-200 rounded-full items-center justify-center mr-2">
                <Text className="text-xs font-bold text-primary-800">{posterInitial}</Text>
              </View>
              <View>
                <Text className="text-sm font-medium text-neutral-900">{poster.name.split(' ')[0]}</Text>
                <View className="flex-row items-center">
                  <IconSymbol name="star.fill" size={10} color="#d17a47" />
                  <Text className="text-xs text-neutral-500 ml-0.5">{Number(poster.trustScore).toFixed(1)}</Text>
                </View>
              </View>
            </View>
          </View>
          <AsambeButton
            title={requesting ? 'Requesting...' : 'Request to join'}
            size="md"
            onPress={handleRequestToJoin}
            disabled={requesting}
          />
        </View>
      ) : null}
    </View>
  );
}

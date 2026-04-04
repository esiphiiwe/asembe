import { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, Pressable, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatBadge } from '@/components/ui/stat-badge';
import { ActivityCard } from '@/components/ui/activity-card';
import { ScreenState } from '@/components/ui/screen-state';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage, isConfigError } from '@/lib/errors';
import { getUserActivities, type UserActivityView } from '@/services/activities';
import { getReviewsForUser, type UserReviewView } from '@/services/reviews';
import { getUserPreferences, type UserPreferenceView } from '@/services/profiles';

export default function ProfileScreen() {
  const { user: authUser, profile, refreshProfile, isLoading: authLoading } = useAuth();

  const [myActivities, setMyActivities] = useState<UserActivityView[]>([]);
  const [myReviews, setMyReviews] = useState<UserReviewView[]>([]);
  const [myPreferences, setMyPreferences] = useState<UserPreferenceView[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadProfileData = useCallback(async () => {
    if (!authUser) return;

    setError(null);

    try {
      const [activities, reviews, preferences] = await Promise.all([
        getUserActivities(authUser.id),
        getReviewsForUser(authUser.id),
        getUserPreferences(authUser.id),
      ]);

      setMyActivities(activities);
      setMyReviews(reviews);
      setMyPreferences(preferences);
    } catch (error) {
      setMyActivities([]);
      setMyReviews([]);
      setMyPreferences([]);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfileData(), refreshProfile()]);
    setRefreshing(false);
  };

  if (authLoading || loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  if (authUser && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon="👤"
          title="Complete your profile"
          description="We need your real profile details before this page can load."
          actionLabel="Finish profile"
          onAction={() => router.replace('/(auth)/signup')}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon={isConfigError(error) ? '🛠️' : '⚠️'}
          title={isConfigError(error) ? 'Finish Supabase setup' : 'Could not load profile'}
          description={getErrorMessage(
            error,
            'We could not load your live profile data right now. Please try again.'
          )}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            void loadProfileData();
          }}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon="👤"
          title="Profile unavailable"
          description="Your profile could not be loaded."
          fullScreen
        />
      </SafeAreaView>
    );
  }

  const userName = profile.name;
  const trustScore = Number(profile.trust_score);
  const verified = profile.verified;
  const city = profile.city;
  const country = profile.country;
  const bio = profile.bio;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e8572a" />
        }
      >
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <Text className="font-serif text-3xl font-bold text-neutral-900">
            My Profile
          </Text>
          <Pressable
            onPress={() => router.push('/settings')}
            className="w-10 h-10 bg-white border border-neutral-200 rounded-full items-center justify-center"
          >
            <IconSymbol name="gearshape.fill" size={18} color="#44403c" />
          </Pressable>
        </View>

        <View className="items-center px-6 pt-4 pb-6">
          <View className="relative">
            <View className="w-24 h-24 bg-primary-200 rounded-full items-center justify-center">
              <Text className="text-3xl font-bold text-primary-800">
                {userName.charAt(0)}
              </Text>
            </View>
            {verified ? (
              <View className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 rounded-full items-center justify-center border-2 border-neutral-50">
                <IconSymbol name="checkmark.circle.fill" size={14} color="#fff" />
              </View>
            ) : null}
          </View>
          <Text className="text-xl font-bold text-neutral-900 mt-3">{userName}</Text>
          <View className="flex-row items-center mt-1">
            <IconSymbol name="mappin" size={13} color="#78716c" />
            <Text className="text-sm text-neutral-500 ml-1">{city}, {country}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center mx-6 bg-white rounded-2xl border border-neutral-100 py-2 mb-6">
          <StatBadge label="Trust Score" value={trustScore.toFixed(1)} icon="star.fill" />
          <View className="w-px h-8 bg-neutral-100" />
          <StatBadge label="Activities" value={myActivities.length} icon="calendar" />
          <View className="w-px h-8 bg-neutral-100" />
          <StatBadge label="Reviews" value={myReviews.length} icon="person.2.fill" />
        </View>

        {bio ? (
          <View className="px-6 mb-6">
            <Text className="text-base text-neutral-700 leading-6">{bio}</Text>
          </View>
        ) : null}

        <View className="px-6 mb-6">
          <Pressable className="w-full border border-neutral-300 rounded-xl py-3 bg-white items-center">
            <Text className="text-base font-semibold text-neutral-800">Edit profile</Text>
          </Pressable>
        </View>

        <View className="h-px bg-neutral-100 mx-6 mb-6" />

        {myPreferences.length > 0 ? (
          <View className="px-6 mb-6">
            <Text className="font-serif text-lg font-bold text-neutral-900 mb-3">My Preferences</Text>
            <View className="flex-row flex-wrap gap-2">
              {myPreferences.map(preference => (
                <View key={preference.id} className="bg-white rounded-xl border border-neutral-100 px-3.5 py-2.5">
                  <View className="flex-row items-center">
                    <Text className="text-base mr-1">{preference.categoryIcon}</Text>
                    <Text className="text-sm font-medium text-neutral-800 capitalize">{preference.categoryName}</Text>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <View className="bg-primary-50 rounded px-1.5 py-0.5">
                      <Text className="text-[10px] font-medium text-primary-700 capitalize">{preference.skillLevel}</Text>
                    </View>
                    {preference.preferredCompanionGender === 'women-only' ? (
                      <View className="bg-pink-50 rounded px-1.5 py-0.5 ml-1">
                        <Text className="text-[10px] font-medium text-pink-700">Women only</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {myActivities.length > 0 ? (
          <View className="mb-6">
            <View className="flex-row items-center justify-between px-6 mb-3">
              <Text className="font-serif text-lg font-bold text-neutral-900">My Activities</Text>
              <Text className="text-sm text-primary-600 font-medium">{myActivities.length} posted</Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={myActivities}
              keyExtractor={item => item.id}
              contentContainerClassName="px-6"
              renderItem={({ item }) => (
                <ActivityCard
                  variant="horizontal"
                  title={item.title}
                  category={item.categoryName}
                  categoryIcon={item.categoryIcon}
                  neighborhood={item.neighborhood}
                  dateLabel={item.dateLabel}
                  posterName={userName}
                  trustScore={trustScore}
                  companionCount={item.companionCount}
                  onPress={() => router.push(`/activity/${item.id}`)}
                />
              )}
            />
          </View>
        ) : null}

        <View className="px-6 mb-8">
          <Text className="font-serif text-lg font-bold text-neutral-900 mb-3">Reviews</Text>
          {myReviews.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-neutral-400 text-sm">No reviews yet</Text>
            </View>
          ) : (
            myReviews.map(review => {
              const reviewDate = new Date(review.createdAt).toLocaleDateString('en-ZA', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <View key={review.id} className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 bg-primary-200 rounded-full items-center justify-center">
                        <Text className="text-xs font-bold text-primary-800">{review.reviewerName.charAt(0)}</Text>
                      </View>
                      <Text className="text-sm font-medium text-neutral-800 ml-2">{review.reviewerName}</Text>
                    </View>
                    <View className="flex-row items-center">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <IconSymbol
                          key={index}
                          name="star.fill"
                          size={13}
                          color={index < review.rating ? '#d17a47' : '#e7e5e4'}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment ? (
                    <Text className="text-sm text-neutral-600 leading-5">{review.comment}</Text>
                  ) : null}
                  <Text className="text-xs text-neutral-400 mt-2">{reviewDate}</Text>
                </View>
              );
            })
          )}
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}

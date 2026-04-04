import { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatBadge } from '@/components/ui/stat-badge';
import { ActivityCard } from '@/components/ui/activity-card';
import { useAuth } from '@/lib/auth-context';
import { getUserActivities } from '@/services/activities';
import { getReviewsForUser } from '@/services/reviews';
import { getUserPreferences } from '@/services/profiles';
import {
  CURRENT_USER,
  MOCK_ACTIVITIES,
  MOCK_REVIEWS,
  MOCK_PREFERENCES,
  formatActivityDate,
} from '@/lib/mock-data';
import { CATEGORIES } from '@/lib/constants';

export default function ProfileScreen() {
  const { user: authUser, profile, refreshProfile } = useAuth();

  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [myPreferences, setMyPreferences] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const loadProfileData = useCallback(async () => {
    if (!authUser) return;
    try {
      const [activities, reviews, prefs] = await Promise.all([
        getUserActivities(authUser.id),
        getReviewsForUser(authUser.id),
        getUserPreferences(authUser.id),
      ]);
      setMyActivities(activities);
      setMyReviews(reviews);
      setMyPreferences(prefs);
      setUseMock(false);
    } catch {
      setUseMock(true);
    }
  }, [authUser?.id]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfileData(), refreshProfile()]);
    setRefreshing(false);
  };

  const displayUser = profile ?? CURRENT_USER;
  const displayActivities = useMock ? MOCK_ACTIVITIES.filter(a => a.userId === CURRENT_USER.id) : myActivities;
  const displayReviews = useMock ? MOCK_REVIEWS : myReviews;
  const displayPreferences = useMock ? MOCK_PREFERENCES.filter(p => p.userId === CURRENT_USER.id) : myPreferences;

  const userName = profile?.name ?? CURRENT_USER.name;
  const trustScore = Number(profile?.trust_score ?? CURRENT_USER.trustScore);
  const verified = profile?.verified ?? CURRENT_USER.verified;
  const city = profile?.city ?? CURRENT_USER.city;
  const country = profile?.country ?? CURRENT_USER.country;
  const bio = profile?.bio ?? CURRENT_USER.bio;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e8572a" />
        }
      >
        {/* Header */}
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

        {/* Profile header */}
        <View className="items-center px-6 pt-4 pb-6">
          <View className="relative">
            <View className="w-24 h-24 bg-primary-200 rounded-full items-center justify-center">
              <Text className="text-3xl font-bold text-primary-800">
                {userName.charAt(0)}
              </Text>
            </View>
            {verified && (
              <View className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 rounded-full items-center justify-center border-2 border-neutral-50">
                <IconSymbol name="checkmark.circle.fill" size={14} color="#fff" />
              </View>
            )}
          </View>
          <Text className="text-xl font-bold text-neutral-900 mt-3">{userName}</Text>
          <View className="flex-row items-center mt-1">
            <IconSymbol name="mappin" size={13} color="#78716c" />
            <Text className="text-sm text-neutral-500 ml-1">{city}, {country}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row items-center justify-center mx-6 bg-white rounded-2xl border border-neutral-100 py-2 mb-6">
          <StatBadge label="Trust Score" value={trustScore.toFixed(1)} icon="star.fill" />
          <View className="w-px h-8 bg-neutral-100" />
          <StatBadge label="Activities" value={displayActivities.length} icon="calendar" />
          <View className="w-px h-8 bg-neutral-100" />
          <StatBadge label="Reviews" value={displayReviews.length} icon="person.2.fill" />
        </View>

        {/* Bio */}
        {bio ? (
          <View className="px-6 mb-6">
            <Text className="text-base text-neutral-700 leading-6">{bio}</Text>
          </View>
        ) : null}

        {/* Edit profile button */}
        <View className="px-6 mb-6">
          <Pressable className="w-full border border-neutral-300 rounded-xl py-3 bg-white items-center">
            <Text className="text-base font-semibold text-neutral-800">Edit profile</Text>
          </Pressable>
        </View>

        <View className="h-px bg-neutral-100 mx-6 mb-6" />

        {/* My Preferences */}
        {displayPreferences.length > 0 && (
          <View className="px-6 mb-6">
            <Text className="font-serif text-lg font-bold text-neutral-900 mb-3">My Preferences</Text>
            <View className="flex-row flex-wrap gap-2">
              {displayPreferences.map((pref: any) => {
                const catName = useMock ? pref.categoryId : (pref.categories?.name ?? pref.category_id);
                const catIcon = useMock
                  ? CATEGORIES.find(c => c.name === pref.categoryId)?.icon
                  : (pref.categories?.icon ?? CATEGORIES.find(c => c.name === catName)?.icon);
                const skillLevel = useMock ? pref.skillLevel : pref.skill_level;
                const genderPref = useMock ? pref.preferredCompanionGender : pref.preferred_companion_gender;
                return (
                  <View key={pref.id ?? catName} className="bg-white rounded-xl border border-neutral-100 px-3.5 py-2.5">
                    <View className="flex-row items-center">
                      <Text className="text-base mr-1">{catIcon}</Text>
                      <Text className="text-sm font-medium text-neutral-800 capitalize">{catName}</Text>
                    </View>
                    <View className="flex-row items-center mt-1">
                      <View className="bg-primary-50 rounded px-1.5 py-0.5">
                        <Text className="text-[10px] font-medium text-primary-700 capitalize">{skillLevel}</Text>
                      </View>
                      {genderPref === 'women-only' && (
                        <View className="bg-pink-50 rounded px-1.5 py-0.5 ml-1">
                          <Text className="text-[10px] font-medium text-pink-700">Women only</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* My Activities */}
        {displayActivities.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between px-6 mb-3">
              <Text className="font-serif text-lg font-bold text-neutral-900">My Activities</Text>
              <Text className="text-sm text-primary-600 font-medium">{displayActivities.length} posted</Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={displayActivities}
              keyExtractor={(item: any) => item.id}
              contentContainerClassName="px-6"
              renderItem={({ item }: { item: any }) => {
                const catName = useMock ? item.categoryName : (item.categories?.name ?? 'other');
                const catIcon = useMock ? item.categoryIcon : (item.categories?.icon ?? '✨');
                const dateLabel = useMock
                  ? formatActivityDate(item.dateTime)
                  : (item.date_time ? formatActivityDate(new Date(item.date_time)) : 'Recurring');
                const pName = useMock ? item.posterName : userName;
                const pScore = useMock ? item.posterTrustScore : trustScore;
                return (
                  <ActivityCard
                    variant="horizontal"
                    title={item.title}
                    category={catName}
                    categoryIcon={catIcon}
                    neighborhood={item.neighborhood}
                    dateLabel={dateLabel}
                    posterName={pName}
                    trustScore={pScore}
                    companionCount={useMock ? item.companionCount : item.companion_count}
                    onPress={() => router.push(`/activity/${item.id}`)}
                  />
                );
              }}
            />
          </View>
        )}

        {/* Reviews */}
        <View className="px-6 mb-8">
          <Text className="font-serif text-lg font-bold text-neutral-900 mb-3">Reviews</Text>
          {displayReviews.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-neutral-400 text-sm">No reviews yet</Text>
            </View>
          ) : (
            displayReviews.map((review: any) => {
              const reviewerName = useMock ? review.reviewerName : review.reviewer_name;
              const reviewDate = useMock
                ? review.createdAt.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date(review.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <View key={review.id} className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 bg-primary-200 rounded-full items-center justify-center">
                        <Text className="text-xs font-bold text-primary-800">{reviewerName.charAt(0)}</Text>
                      </View>
                      <Text className="text-sm font-medium text-neutral-800 ml-2">{reviewerName}</Text>
                    </View>
                    <View className="flex-row items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <IconSymbol
                          key={i}
                          name="star.fill"
                          size={13}
                          color={i < review.rating ? '#d17a47' : '#e7e5e4'}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <Text className="text-sm text-neutral-600 leading-5">{review.comment}</Text>
                  )}
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

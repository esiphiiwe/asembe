import { useState, useEffect, useCallback, useDeferredValue } from 'react';
import { Text, View, ScrollView, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SearchBar } from '@/components/ui/search-bar';
import { CategoryChip } from '@/components/ui/category-chip';
import { ActivityCard } from '@/components/ui/activity-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenState } from '@/components/ui/screen-state';
import { CATEGORIES } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage, isConfigError } from '@/lib/errors';
import { getOpenActivities, type ActivityFeedItem } from '@/services/activities';

export default function HomeScreen() {
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const deferredSearchText = useDeferredValue(searchText.trim());

  const loadActivities = useCallback(async () => {
    setError(null);

    try {
      const data = await getOpenActivities({
        city: profile?.city,
        category: selectedCategory ?? undefined,
        search: deferredSearchText || undefined,
      });
      setActivities(data);
    } catch (error) {
      setActivities([]);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [deferredSearchText, profile?.city, selectedCategory]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const featuredActivities = activities.slice(0, 4);
  const nearbyActivities = activities.length > 4 ? activities.slice(4) : activities;

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon={isConfigError(error) ? '🛠️' : '⚠️'}
          title={isConfigError(error) ? 'Finish Supabase setup' : 'Could not load activities'}
          description={getErrorMessage(
            error,
            'We could not load live activities right now. Please try again.'
          )}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            void loadActivities();
          }}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <View>
          <Text className="font-serif text-3xl font-bold text-neutral-900">
            Asambe
          </Text>
          <Text className="text-sm text-neutral-400 mt-0.5">
            {profile?.city ?? 'Your city'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          className="w-10 h-10 bg-white border border-neutral-200 rounded-full items-center justify-center"
        >
          <IconSymbol name="gearshape.fill" size={18} color="#44403c" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e8572a" />
        }
      >
        <View className="px-6 mb-4">
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search activities, neighborhoods..."
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-6 pb-4"
        >
          <Pressable
            onPress={() => setSelectedCategory(null)}
            className={`px-4 py-2.5 rounded-full mr-2 border ${
              !selectedCategory
                ? 'bg-neutral-900 border-neutral-900'
                : 'bg-white border-neutral-200'
            }`}
          >
            <Text className={`text-sm font-medium ${!selectedCategory ? 'text-white' : 'text-neutral-700'}`}>
              All
            </Text>
          </Pressable>
          {CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.name}
              icon={cat.icon}
              label={cat.name}
              selected={selectedCategory === cat.name}
              onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
            />
          ))}
        </ScrollView>

        <View className="mb-6">
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="font-serif text-xl font-bold text-neutral-900">
              Happening this week
            </Text>
            <Pressable className="flex-row items-center">
              <Text className="text-sm font-medium text-primary-600 mr-0.5">See all</Text>
              <IconSymbol name="chevron.right" size={14} color="#c3653c" />
            </Pressable>
          </View>
          {featuredActivities.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredActivities}
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
                  posterName={item.posterName}
                  trustScore={item.posterTrustScore}
                  companionCount={item.companionCount}
                  onPress={() => router.push(`/activity/${item.id}`)}
                />
              )}
            />
          ) : (
            <View className="px-6">
              <ScreenState
                icon="🗓️"
                title="No activities yet"
                description={
                  deferredSearchText
                    ? 'No live activities match your search yet.'
                    : 'When people post open activities in your city, they will show up here.'
                }
              />
            </View>
          )}
        </View>

        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-serif text-xl font-bold text-neutral-900">
              Near you
            </Text>
            <Pressable className="flex-row items-center">
              <Text className="text-sm font-medium text-primary-600 mr-0.5">See all</Text>
              <IconSymbol name="chevron.right" size={14} color="#c3653c" />
            </Pressable>
          </View>
          {nearbyActivities.length > 0 ? (
            nearbyActivities.map(item => (
              <ActivityCard
                key={item.id}
                variant="vertical"
                title={item.title}
                category={item.categoryName}
                categoryIcon={item.categoryIcon}
                neighborhood={item.neighborhood}
                dateLabel={item.dateLabel}
                posterName={item.posterName}
                trustScore={item.posterTrustScore}
                companionCount={item.companionCount}
                onPress={() => router.push(`/activity/${item.id}`)}
              />
            ))
          ) : featuredActivities.length > 0 ? (
            <Text className="text-sm text-neutral-400 py-6">
              More live activities will appear here as they are posted.
            </Text>
          ) : null}
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
